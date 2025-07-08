/*
 * This file is part of WPPConnect.
 *
 * WPPConnect is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * WPPConnect is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with WPPConnect.  If not, see <https://www.gnu.org/licenses/>.
 */
import { create, Whatsapp } from '@wppconnect-team/wppconnect';
import { PrismaClient, MessageType } from '@prisma/client';
import { WebSocketService } from './websocket';
import { BotEngineService } from './botEngine';

const prisma = new PrismaClient();

export class WhatsAppService {
  private connections: Map<string, Whatsapp> = new Map();
  private webSocketService?: WebSocketService;
  private botEngineService: BotEngineService;

  constructor() {
    this.botEngineService = new BotEngineService();
  }

  setWebSocketService(webSocketService: WebSocketService) {
    this.webSocketService = webSocketService;
  }

  async createSession(sessionName: string, tenantId: string, userId: string) {
    try {
      console.log(`Creating WhatsApp session: ${sessionName}`);

      const client = await create({
        session: sessionName,
        catchQR: (base64Qr, asciiQR, attempts, urlCode) => {
          console.log('QR Code generated for session:', sessionName);
          this.handleQRCode(sessionName, base64Qr, tenantId);
        },
        statusFind: (statusSession, session) => {
          console.log('Status session:', statusSession, session);
          this.handleStatusChange(sessionName, statusSession, tenantId);
        },
        headless: true,
        devtools: false,
        useChrome: true,
        debug: false,
        logQR: false,
        browserArgs: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
        ],
      });

      // Store connection
      this.connections.set(sessionName, client);

      // Set up message listener
      client.onMessage(async (message) => {
        await this.handleIncomingMessage(message, sessionName, tenantId);
      });

      // Update database
      await prisma.whatsappInstance.update({
        where: { sessionName },
        data: {
          status: 'CONNECTING',
          lastSeen: new Date(),
        },
      });

      return client;
    } catch (error) {
      console.error('Error creating WhatsApp session:', error);
      await prisma.whatsappInstance.update({
        where: { sessionName },
        data: { status: 'ERROR' },
      });

      throw error;
    }
  }

  async destroySession(sessionName: string) {
    try {
      const client = this.connections.get(sessionName);
      if (client) {
        await client.close();
        this.connections.delete(sessionName);
      }

      await prisma.whatsappInstance.update({
        where: { sessionName },
        data: { status: 'DISCONNECTED' },
      });

      console.log(`Session ${sessionName} destroyed`);
    } catch (error) {
      console.error('Error destroying session:', error);
    }
  }

  async sendMessage(
    sessionName: string,
    to: string,
    message: string,
    type: 'text' | 'image' | 'document' = 'text',
    mediaPath?: string
  ) {
    try {
      const client = this.connections.get(sessionName);
      if (!client) {
        throw new Error('WhatsApp session not found');
      }

      let result;

      switch (type) {
        case 'text':
          result = await client.sendText(to, message);
          break;
        case 'image':
          if (mediaPath) {
            result = await client.sendImage(to, mediaPath, 'image', message);
          }
          break;
        case 'document':
          if (mediaPath) {
            result = await client.sendFile(to, mediaPath, 'document', message);
          }
          break;
        default:
          result = await client.sendText(to, message);
      }

      return result;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async sendButtons(
    sessionName: string,
    to: string,
    text: string,
    buttons: any[]
  ) {
    try {
      const client = this.connections.get(sessionName);
      if (!client) {
        throw new Error('WhatsApp session not found');
      }

      const buttonMessage = {
        text,
        buttons: buttons.map((btn, index) => ({
          id: btn.id || `btn_${index}`,
          text: btn.title,
        })),
      };

      // Fallback: send a text message with button options listed, since sendButtons is not available
      const buttonsText = buttonMessage.buttons
        .map((btn, idx) => `${idx + 1}. ${btn.text}`)
        .join('\n');
      const fullText = `${buttonMessage.text}\n\n${buttonsText}`;
      return await client.sendText(to, fullText);
    } catch (error) {
      console.error('Error sending buttons:', error);
      throw error;
    }
  }

  async sendList(
    sessionName: string,
    to: string,
    text: string,
    buttonText: string,
    sections: any[]
  ) {
    try {
      const client = this.connections.get(sessionName);
      if (!client) {
        throw new Error('WhatsApp session not found');
      }

      // Fallback: send a text message with list options since sendList is not available
      const sectionsText = sections
        .map((section: any, idx: number) => {
          const title = section.title ? `*${section.title}*\n` : '';
          const rows = section.rows
            .map((row: any, rowIdx: number) => `${rowIdx + 1}. ${row.title}`)
            .join('\n');
          return `${title}${rows}`;
        })
        .join('\n\n');
      const fullText = `${text}\n\n${sectionsText}`;
      return await client.sendText(to, fullText);
    } catch (error) {
      console.error('Error sending list:', error);
      throw error;
    }
  }

  private async handleQRCode(
    sessionName: string,
    qrCode: string,
    tenantId: string
  ) {
    try {
      await prisma.whatsappInstance.update({
        where: { sessionName },
        data: {
          qrCode,
          status: 'QR_CODE',
        },
      });

      // Emit QR code via WebSocket
      if (this.webSocketService) {
        this.webSocketService.emitWhatsAppStatus(
          tenantId,
          sessionName,
          'QR_CODE',
          qrCode
        );
      }
    } catch (error) {
      console.error('Error handling QR code:', error);
    }
  }

  private async handleStatusChange(
    sessionName: string,
    status: string,
    tenantId: string
  ) {
    try {
      let dbStatus = 'DISCONNECTED';

      switch (status) {
        case 'inChat':
        case 'isLogged':
          dbStatus = 'CONNECTED';
          break;
        case 'notLogged':
          dbStatus = 'DISCONNECTED';
          break;
        case 'browserClose':
        case 'serverClose':
          dbStatus = 'ERROR';
          break;
        case 'qrReadError':
        case 'qrReadFail':
          dbStatus = 'QR_CODE';
          break;
        default:
          dbStatus = 'CONNECTING';
      }

      await prisma.whatsappInstance.update({
        where: { sessionName },
        data: {
          status: dbStatus as any,
          lastSeen: new Date(),
          ...(dbStatus === 'CONNECTED' && { qrCode: null }),
        },
      });

      // Emit status via WebSocket
      if (this.webSocketService) {
        this.webSocketService.emitWhatsAppStatus(
          tenantId,
          sessionName,
          dbStatus
        );
      }
    } catch (error) {
      console.error('Error handling status change:', error);
    }
  }

  private async handleIncomingMessage(
    message: any,
    sessionName: string,
    tenantId: string
  ) {
    try {
      // Find WhatsApp instance
      const instance = await prisma.whatsappInstance.findUnique({
        where: { sessionName },
        include: { chatbots: true },
      });

      if (!instance) return;

      // Find or create conversation
      let conversation = await prisma.conversation.findFirst({
        where: {
          contactPhone: message.from,
          whatsappInstanceId: instance.id,
          status: 'ACTIVE',
        },
      });

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            contactPhone: message.from,
            contactName: message.sender?.pushname || message.from,
            tenantId,
            whatsappInstanceId: instance.id,
          },
        });
      }

      // Save message
      const savedMessage = await prisma.message.create({
        data: {
          content: message.body || '',
          messageType: this.getMessageType(message),
          mediaUrl: message.mediaUrl,
          isFromBot: false,
          whatsappMessageId: message.id,
          conversationId: conversation.id,
          whatsappInstanceId: instance.id,
        },
      });

      // Update conversation
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date() },
      });

      // Emit new message via WebSocket
      if (this.webSocketService) {
        this.webSocketService.emitNewMessage(
          tenantId,
          conversation.id,
          savedMessage
        );
      }

      // Process with bot engine if not from human agent
      if (!conversation.isHuman && instance.chatbots.length > 0) {
        await this.botEngineService.processMessage(
          message,
          conversation,
          instance.chatbots,
          this
        );
      }
    } catch (error) {
      console.error('Error handling incoming message:', error);
    }
  }

  private getMessageType(message: any): MessageType {
    if (message.type === 'image') return MessageType.IMAGE;
    if (message.type === 'document') return MessageType.DOCUMENT;
    if (message.type === 'audio') return MessageType.AUDIO;
    if (message.type === 'video') return MessageType.VIDEO;
    if (message.type === 'sticker') return MessageType.STICKER;
    if (message.type === 'location') return MessageType.LOCATION;
    if (message.type === 'contact') return MessageType.CONTACT;
    return MessageType.TEXT;
  }

  getConnection(sessionName: string): Whatsapp | undefined {
    return this.connections.get(sessionName);
  }

  getAllConnections(): Map<string, Whatsapp> {
    return this.connections;
  }
}
