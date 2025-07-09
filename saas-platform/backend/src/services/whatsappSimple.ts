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
import { PrismaClient } from '@prisma/client';
import { WebSocketService } from './websocket';

const prisma = new PrismaClient();

export class WhatsAppService {
  private connections: Map<string, Whatsapp> = new Map();
  private webSocketService?: WebSocketService;

  constructor() {}

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
        console.log('Received message:', message);
      });

      // Update database
      const instance = await prisma.whatsappInstance.findFirst({
        where: {
          name: sessionName,
          tenantId: tenantId,
        },
      });

      if (instance) {
        await prisma.whatsappInstance.update({
          where: { id: instance.id },
          data: {
            status: 'CONNECTING',
            updatedAt: new Date(),
          },
        });
      }

      return client;
    } catch (error) {
      console.error('Error creating WhatsApp session:', error);
      const instance = await prisma.whatsappInstance.findFirst({
        where: {
          name: sessionName,
          tenantId: tenantId,
        },
      });

      if (instance) {
        await prisma.whatsappInstance.update({
          where: { id: instance.id },
          data: { status: 'ERROR' },
        });
      }

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

      const instance = await prisma.whatsappInstance.findFirst({
        where: { name: sessionName },
      });

      if (instance) {
        await prisma.whatsappInstance.update({
          where: { id: instance.id },
          data: { status: 'DISCONNECTED' },
        });
      }

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

  private async handleQRCode(
    sessionName: string,
    qrCode: string,
    tenantId: string
  ) {
    try {
      const instance = await prisma.whatsappInstance.findFirst({
        where: {
          name: sessionName,
          tenantId: tenantId,
        },
      });

      if (instance) {
        await prisma.whatsappInstance.update({
          where: { id: instance.id },
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

      const instance = await prisma.whatsappInstance.findFirst({
        where: {
          name: sessionName,
          tenantId: tenantId,
        },
      });

      if (instance) {
        await prisma.whatsappInstance.update({
          where: { id: instance.id },
          data: {
            status: dbStatus as any,
            updatedAt: new Date(),
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
      }
    } catch (error) {
      console.error('Error handling status change:', error);
    }
  }

  getConnection(sessionName: string): Whatsapp | undefined {
    return this.connections.get(sessionName);
  }

  getAllConnections(): Map<string, Whatsapp> {
    return this.connections;
  }
}
