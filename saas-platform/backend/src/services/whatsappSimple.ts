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

import { create, Whatsapp, defaultLogger } from '@wppconnect-team/wppconnect';
import { PrismaClient } from '@prisma/client';
import { WebSocketService } from './websocket';
import * as path from 'path';
import * as fs from 'fs';

const prisma = new PrismaClient();

// Configure logger
defaultLogger.level = 'info';
// Uncomment to disable console logging in production
// defaultLogger.transports.forEach((t) => (t.silent = true));

export class WhatsAppService {
  private connections: Map<string, Whatsapp> = new Map();
  private webSocketService?: WebSocketService;
  private tokensDir: string;
  private reconnectIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    // Create tokens directory if it doesn't exist
    this.tokensDir = path.join(process.cwd(), 'tokens');
    if (!fs.existsSync(this.tokensDir)) {
      fs.mkdirSync(this.tokensDir, { recursive: true });
    }
  }

  setWebSocketService(webSocketService: WebSocketService) {
    this.webSocketService = webSocketService;
  }

  async createSession(sessionName: string, tenantId: string, userId: string) {
    try {
      console.log(`Creating WhatsApp session: ${sessionName}`);

      // Force cleanup any existing session with same name first
      await this.forceDestroySession(sessionName);
      
      // Wait a moment for cleanup to complete
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Ensure session directory exists for multidevice support
      const sessionDir = path.join(this.tokensDir, sessionName);
      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
      }

      const client = await create({
        session: sessionName,
        logger: defaultLogger,
        catchQR: (base64Qr, asciiQr, attempts, urlCode) => {
          console.log(
            `QR Code generated for session: ${sessionName} (attempt ${attempts})`
          );
          console.log('URL Code:', urlCode);
          this.handleQRCode(sessionName, base64Qr, tenantId);
        },
        statusFind: (statusSession, session) => {
          console.log('Status session:', statusSession, session);
          this.handleStatusChange(sessionName, statusSession, tenantId);
        },
        onLoadingScreen: (percent, message) => {
          console.log(`Loading ${sessionName}: ${percent}% - ${message}`);
        },
        headless: true,
        devtools: false,
        useChrome: true,
        debug: false,
        logQR: false, // We handle QR via catchQR callback
        autoClose: 300000, // 5 minutes timeout for QR scanning (increased from 60s)
        folderNameToken: this.tokensDir,
        updatesLog: true,
        disableWelcome: true,
        // Multidevice support configuration
        puppeteerOptions: {
          userDataDir: sessionDir,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
          ],
        },
        browserArgs: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
        ],
      });

      // Store connection
      this.connections.set(sessionName, client);

      // Start phone watchdog for connection verification
      this.startPhoneWatchdog(client, sessionName);

      // Set up comprehensive message listener
      client.onMessage(async (message) => {
        await this.handleIncomingMessage(message, sessionName, tenantId);
      });

      // Handle state changes
      client.onStateChange((state) => {
        console.log(`State change for ${sessionName}:`, state);
        if (state === 'CONFLICT' || state === 'UNLAUNCHED') {
          this.handleDisconnection(sessionName, tenantId);
        }
      });

      // Handle disconnections
      client.onIncomingCall(async (call) => {
        console.log('Incoming call:', call);
        // You can implement call handling logic here
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
        try {
          // Stop phone watchdog if running
          // client.stopPhoneWatchdog();
        } catch (error) {
          console.error('Error stopping phone watchdog:', error);
        }

        await client.close();
        this.connections.delete(sessionName);
      }

      // Clear any scheduled reconnection
      const reconnectInterval = this.reconnectIntervals.get(sessionName);
      if (reconnectInterval) {
        clearTimeout(reconnectInterval);
        this.reconnectIntervals.delete(sessionName);
      }

      const instance = await prisma.whatsappInstance.findFirst({
        where: { name: sessionName },
      });

      if (instance) {
        await prisma.whatsappInstance.update({
          where: { id: instance.id },
          data: {
            status: 'DISCONNECTED',
            qrCode: null,
            updatedAt: new Date(),
          },
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
    type:
      | 'text'
      | 'image'
      | 'document'
      | 'video'
      | 'audio'
      | 'sticker' = 'text',
    mediaPath?: string
  ) {
    try {
      console.log(`🔍 SendMessage called with:`, {
        sessionName,
        to,
        toType: typeof to,
        toLength: to?.length,
        isEmpty: !to || to.trim() === '',
        message: message.substring(0, 50) + '...',
        type,
      });

      const client = this.connections.get(sessionName);
      if (!client) {
        console.log(`❌ No client found for session: ${sessionName}`);
        console.log(
          `📊 Available sessions:`,
          Array.from(this.connections.keys())
        );
        throw new Error(
          `WhatsApp session '${sessionName}' not found or not connected`
        );
      }

      // Check if client is actually connected
      const isConnected = await client.isConnected().catch(() => false);
      console.log(`🔗 Client connection status:`, { sessionName, isConnected });

      if (!isConnected) {
        throw new Error(`WhatsApp session '${sessionName}' is not connected`);
      }

      // Format number for WhatsApp Web
      let formattedTo = to.replace(/\D/g, ''); // Remove non-digits
      console.log(`🔧 Number formatting:`, {
        original: to,
        cleaned: formattedTo,
        hasAtSymbol: to.includes('@'),
        isValidLength: formattedTo.length >= 10 && formattedTo.length <= 15,
      });
      // Add @c.us suffix if not present
      if (!formattedTo.includes('@')) {
        formattedTo = `${formattedTo}@c.us`;
      }
      console.log(
        `📤 Sending ${type} message from ${sessionName} to ${formattedTo}: "${message}"`
      );

      let result;

      switch (type) {
        case 'text':
          result = await client.sendText(formattedTo, message);
          break;
        case 'image':
          if (mediaPath) {
            result = await client.sendImage(
              formattedTo,
              mediaPath,
              'image',
              message
            );
          } else {
            throw new Error('Media path is required for image messages');
          }
          break;
        case 'document':
          if (mediaPath) {
            result = await client.sendFile(
              formattedTo,
              mediaPath,
              'document',
              message
            );
          } else {
            throw new Error('Media path is required for document messages');
          }
          break;
        case 'video':
          if (mediaPath) {
            result = await client.sendVideoAsGif(
              formattedTo,
              mediaPath,
              'video',
              message
            );
          } else {
            throw new Error('Media path is required for video messages');
          }
          break;
        case 'audio':
          if (mediaPath) {
            result = await client.sendFile(
              formattedTo,
              mediaPath,
              'audio',
              message
            );
          } else {
            throw new Error('Media path is required for audio messages');
          }
          break;
        case 'sticker':
          if (mediaPath) {
            result = await client.sendImageAsSticker(formattedTo, mediaPath);
          } else {
            throw new Error('Media path is required for sticker messages');
          }
          break;
        default:
          result = await client.sendText(formattedTo, message);
      }

      console.log(`Message sent successfully from ${sessionName} to ${formattedTo}`);
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
      console.log(`📱 Handling QR code for session: ${sessionName}`);
      console.log(`QR Code length: ${qrCode.length}`);
      const instance = await prisma.whatsappInstance.findFirst({
        where: {
          name: sessionName,
          tenantId: tenantId,
        },
      });

      if (instance) {
        console.log(
          `✅ Found instance ${instance.id}, updating with QR code...`
        );
        await prisma.whatsappInstance.update({
          where: { id: instance.id },
          data: {
            qrCode,
            status: 'QR_CODE',
          },
        });

        console.log(
          `💾 QR code saved to database for instance: ${instance.id}`
        );

        // Emit QR code via WebSocket
        if (this.webSocketService) {
          this.webSocketService.emitWhatsAppStatus(
            tenantId,
            sessionName,
            'QR_CODE',
            qrCode
          );
          console.log(`📡 QR code emitted via WebSocket`);
        } else {
          console.log(`⚠️  WebSocket service not available`);
        }
      } else {
        console.log(`❌ Instance not found for session: ${sessionName}`);
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
          dbStatus = 'QR_CODE'; // Change to QR_CODE instead of DISCONNECTED when waiting for QR
          break;
        case 'autocloseCalled':
          console.log(
            `⚠️  Auto close called for session ${sessionName} - QR code timeout`
          );
          dbStatus = 'ERROR';
          // Trigger automatic restart
          this.handleAutoCloseTimeout(sessionName, tenantId);
          break;
        case 'browserClose':
        case 'serverClose':
          dbStatus = 'ERROR';
          break;
        case 'qrReadError':
        case 'qrReadFail':
          dbStatus = 'ERROR';
          break;
        case 'qrReadSuccess':
          dbStatus = 'CONNECTING';
          break;
        case 'desconnectedMobile':
          dbStatus = 'DISCONNECTED';
          break;
        default:
          console.log(`ℹ️  Unknown status for ${sessionName}: ${status}`);
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

  /**
   * Start phone watchdog to monitor connection
   */
  private startPhoneWatchdog(client: Whatsapp, sessionName: string) {
    try {
      // Start phone watchdog with 30 second interval
      client.startPhoneWatchdog(30000);
      console.log(`Phone watchdog started for session: ${sessionName}`);
    } catch (error) {
      console.error(`Error starting phone watchdog for ${sessionName}:`, error);
    }
  }

  /**
   * Handle incoming messages
   */
  private async handleIncomingMessage(
    message: any,
    sessionName: string,
    tenantId: string
  ) {
    try {
      console.log('🚨 REAL MESSAGE RECEIVED:', {
        messageId: message.id,
        from: message.from,
        type: message.type,
        body: message.body,
        session: sessionName,
        tenantId,
        timestamp: new Date().toISOString(),
      });

      // Store message in database - try multiple strategies
      let instance = await prisma.whatsappInstance.findFirst({
        where: { name: sessionName, tenantId },
      });

      console.log('🔍 Instance lookup result (with tenantId):', {
        sessionName,
        tenantId,
        instanceFound: !!instance,
        instanceId: instance?.id,
      });

      // If not found with tenantId, try without tenantId (fallback)
      if (!instance) {
        console.log('🔍 Trying fallback search without tenantId...');
        instance = await prisma.whatsappInstance.findFirst({
          where: { name: sessionName },
        });

        console.log('� Fallback instance lookup result:', {
          sessionName,
          instanceFound: !!instance,
          instanceId: instance?.id,
          actualTenantId: instance?.tenantId,
        });
      }

      if (instance) {
        // Solo responder si el número NO está registrado en la base de datos (nuevo lead)
        const fromPhone = message.from.includes('@g.us')
          ? message.from
          : message.from.replace('@c.us', '');
        const conversation = await prisma.conversation.findFirst({
          where: {
            contactPhone: fromPhone,
            whatsappInstanceId: instance.id,
          },
        });
        // Responder siempre al número de prueba
        const testNumber = '5215549681111';
        if (!conversation || fromPhone === testNumber) {
          console.log('🤖 Activando respuesta GPT para lead o número de prueba:', fromPhone);
          try {
            const { getGPTReply } = await import('./gptService');
            const gptReply = await getGPTReply(message.body);
            // Enviar respuesta por WhatsApp
            await this.sendMessage(sessionName, fromPhone, gptReply, 'text');
            console.log(`✅ Respuesta GPT enviada a ${fromPhone}: "${gptReply}"`);
          } catch (err) {
            console.error('❌ Error GPT:', err);
          }
        }
      } else {
        console.log(
          '❌ No instance found for sessionName:',
          sessionName,
          'tenantId:',
          tenantId
        );
        // List all instances for debugging
        const allInstances = await prisma.whatsappInstance.findMany({
          select: { id: true, name: true, tenantId: true },
        });
        console.log('📋 All available instances:', allInstances);
      }
    } catch (error) {
      console.error('❌ Error handling incoming message:', error);
    }
  }

  /**
   * Handle disconnection events
   */
  private async handleDisconnection(sessionName: string, tenantId: string) {
    try {
      console.log(`Handling disconnection for session: ${sessionName}`);
      const client = this.connections.get(sessionName);
      if (client) {
        try {
          // stopPhoneWatchdog doesn't take parameters in newer versions
          // client.stopPhoneWatchdog();
        } catch (error) {
          console.error('Error stopping phone watchdog:', error);
        }
      }

      // Update database status
      const instance = await prisma.whatsappInstance.findFirst({
        where: { name: sessionName, tenantId },
      });

      if (instance) {
        await prisma.whatsappInstance.update({
          where: { id: instance.id },
          data: {
            status: 'DISCONNECTED',
            updatedAt: new Date(),
          },
        });

        // Emit disconnection via WebSocket
        if (this.webSocketService) {
          this.webSocketService.emitWhatsAppStatus(
            tenantId,
            sessionName,
            'DISCONNECTED'
          );
        }
      }

      // Schedule reconnection attempt
      this.scheduleReconnection(sessionName, tenantId);
    } catch (error) {
      console.error('Error handling disconnection:', error);
    }
  }

  /**
   * Schedule automatic reconnection
   */
  private scheduleReconnection(sessionName: string, tenantId: string) {
    // Clear existing reconnection interval
    const existingInterval = this.reconnectIntervals.get(sessionName);
    if (existingInterval) {
      clearTimeout(existingInterval);
    }

    // Schedule reconnection in 30 seconds
    const reconnectTimeout = setTimeout(async () => {
      try {
        console.log(`Attempting to reconnect session: ${sessionName}`);
        await this.createSession(sessionName, tenantId, ''); // userId not needed for reconnection
      } catch (error) {
        console.error(`Failed to reconnect session ${sessionName}:`, error);
        // Schedule another attempt in 2 minutes
        setTimeout(() => {
          this.scheduleReconnection(sessionName, tenantId);
        }, 120000);
      }
    }, 30000);

    this.reconnectIntervals.set(sessionName, reconnectTimeout);
  }

  /**
   * Check if a session is connected and ready
   */
  async isSessionReady(sessionName: string): Promise<boolean> {
    try {
      const client = this.connections.get(sessionName);
      if (!client) {
        return false;
      }

      const isConnected = await client.isConnected();
      return isConnected;
    } catch (error) {
      console.error('Error checking session status:', error);
      return false;
    }
  }

  /**
   * Get session phone number
   */
  async getSessionPhone(sessionName: string): Promise<string | null> {
    try {
      const client = this.connections.get(sessionName);
      if (!client) {
        return null;
      }

      const hostDevice = await client.getHostDevice();
      if (hostDevice && hostDevice.wid && typeof hostDevice.wid.user === 'string') {
        return hostDevice.wid.user;
      }
      return null;
    } catch (error) {
      console.error('Error getting session phone:', error);
      return null;
    }
  }

  /**
   * Send typing indicator
   */
  async sendTyping(sessionName: string, to: string, isTyping: boolean = true) {
    try {
      const client = this.connections.get(sessionName);
      if (!client) {
        throw new Error('WhatsApp session not found');
      }

      if (isTyping) {
        await client.startTyping(to);
      } else {
        await client.stopTyping(to);
      }
    } catch (error) {
      console.error('Error sending typing indicator:', error);
      throw error;
    }
  }

  /**
   * Mark message as seen
   */
  async markAsSeen(sessionName: string, messageId: string) {
    try {
      const client = this.connections.get(sessionName);
      if (!client) {
        throw new Error('WhatsApp session not found');
      }

      await client.sendSeen(messageId);
    } catch (error) {
      console.error('Error marking message as seen:', error);
      throw error;
    }
  }

  /**
   * Get session token for backup/restore
   */
  async getSessionToken(sessionName: string) {
    try {
      const client = this.connections.get(sessionName);
      if (!client) {
        throw new Error('WhatsApp session not found');
      }

      const token = await client.getSessionTokenBrowser();
      return token;
    } catch (error) {
      console.error('Error getting session token:', error);
      throw error;
    }
  }

  /**
   * Restart a session
   */
  async restartSession(sessionName: string, tenantId: string) {
    try {
      console.log(`Restarting session: ${sessionName}`);
      await this.destroySession(sessionName);
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds
      await this.createSession(sessionName, tenantId, '');
    } catch (error) {
      console.error('Error restarting session:', error);
      throw error;
    }
  }

  /**
   * Handle auto close timeout - restart session automatically
   */
  private async handleAutoCloseTimeout(sessionName: string, tenantId: string) {
    try {
      console.log(`🔄 Handling auto close timeout for session: ${sessionName}`);
      // Wait a moment before restarting
      await new Promise((resolve) => setTimeout(resolve, 5000));
      // Attempt to restart the session
      console.log(`🔄 Attempting to restart session: ${sessionName}`);
      await this.createSession(sessionName, tenantId, '');
    } catch (error) {
      console.error(`❌ Failed to restart session ${sessionName}:`, error);
      // Update database with error status
      const instance = await prisma.whatsappInstance.findFirst({
        where: { name: sessionName, tenantId },
      });

      if (instance) {
        await prisma.whatsappInstance.update({
          where: { id: instance.id },
          data: {
            status: 'ERROR',
            updatedAt: new Date(),
          },
        });
      }
    }
  }

  getConnection(sessionName: string): Whatsapp | undefined {
    return this.connections.get(sessionName);
  }

  getAllConnections(): Map<string, Whatsapp> {
    return this.connections;
  }

  /**
   * Get all active session names
   */
  getActiveSessionNames(): string[] {
    return Array.from(this.connections.keys());
  }

  /**
   * Get session information for all active sessions
   */
  async getAllSessionsInfo(): Promise<
    Array<{
      sessionName: string;
      isConnected: boolean;
      isOnline: boolean;
      phoneNumber: string | null;
      batteryLevel: number | null;
      connectionState: any;
    }>
  > {
    const sessions = [];
    for (const [sessionName, client] of this.connections) {
      try {
        const sessionInfo = {
          sessionName,
          isConnected: await client.isConnected().catch(() => false),
          isOnline: await client.isOnline().catch(() => false),
          phoneNumber: await this.getSessionPhone(sessionName),
          batteryLevel: await client.getBatteryLevel().catch(() => null),
          connectionState: await client.getConnectionState().catch(() => null),
        };
        sessions.push(sessionInfo);
      } catch (error) {
        console.error(`Error getting info for session ${sessionName}:`, error);
        sessions.push({
          sessionName,
          isConnected: false,
          isOnline: false,
          phoneNumber: null,
          batteryLevel: null,
          connectionState: null,
        });
      }
    }
    return sessions;
  }

  /**
   * Store incoming message in database
   */
  private async storeMessage(
    message: any,
    instanceId: string,
    tenantId: string
  ): Promise<void> {
    try {
      console.log('🗄️ Storing message in database:', {
        messageId: message.id,
        from: message.from,
        body: message.body,
        instanceId,
        tenantId,
      });

      // Extract phone number (remove group suffix if exists)
      const fromPhone = message.from.includes('@g.us')
        ? message.from
        : message.from.replace('@c.us', '');

      console.log('📞 Processed phone number:', fromPhone);
      // Find or create conversation
      let conversation = await prisma.conversation.findFirst({
        where: {
          contactPhone: fromPhone,
          whatsappInstanceId: instanceId,
        },
      });

      console.log(
        '💬 Found existing conversation:',
        conversation?.id || 'None'
      );

      if (!conversation) {
        console.log('🆕 Creating new conversation for:', fromPhone);
        // Create a new conversation
        conversation = await prisma.conversation.create({
          data: {
            contactPhone: fromPhone,
            contactName: message.notifyName || message.pushname || null,
            whatsappInstanceId: instanceId,
            // We need a chatbot to associate, for now use null or find one
            chatbotId: await this.getDefaultChatbotId(instanceId, tenantId),
            status: 'ACTIVE',
          },
        });
        console.log('✅ Created new conversation:', conversation.id);
      }

      // Store the message
      const newMessage = await prisma.message.create({
        data: {
          content: message.body || message.caption || '[Media]',
          messageType: message.type || 'chat',
          isFromBot: false,
          conversationId: conversation.id,
          metadata: JSON.stringify({
            originalMessageId: message.id,
            from: message.from,
            timestamp: message.timestamp,
            isGroupMessage: message.from.includes('@g.us'),
            hasMedia: !!message.hasMedia,
          }),
        },
      });

      console.log(
        `✅ Message stored in database - ID: ${newMessage.id}, Content: "${newMessage.content}"`
      );
    } catch (error) {
      console.error('❌ Error storing message in database:', error);
    }
  }

  /**
   * Get default chatbot for instance or create one
   */
  private async getDefaultChatbotId(
    instanceId: string,
    tenantId: string
  ): Promise<string> {
    try {
      // Try to find existing chatbot for this instance
      let chatbot = await prisma.chatbot.findFirst({
        where: {
          whatsappInstanceId: instanceId,
          tenantId,
        },
      });

      if (!chatbot) {
        // Create a default chatbot
        const instance = await prisma.whatsappInstance.findUnique({
          where: { id: instanceId },
        });

        chatbot = await prisma.chatbot.create({
          data: {
            name: `Bot ${instance?.name || 'Default'}`,
            description: 'Chatbot creado automáticamente',
            tenantId,
            whatsappInstanceId: instanceId,
            welcomeMessage: 'Hola! ¿En qué puedo ayudarte?',
          },
        });

        console.log(`🤖 Created default chatbot for instance ${instanceId}`);
      }

      return chatbot.id;
    } catch (error) {
      console.error('❌ Error getting/creating chatbot:', error);
      throw error;
    }
  }

  /**
   * Force destroy session - completely clean up including browser and tokens
   */
  async forceDestroySession(sessionName: string) {
    try {
      console.log(`🗑️ Force destroying session: ${sessionName}`);
      
      // Close browser connection
      const client = this.connections.get(sessionName);
      if (client) {
        try {
          await client.close();
        } catch (error) {
          console.error('Error closing client:', error);
        }
        this.connections.delete(sessionName);
      }

      // Clear any scheduled reconnection
      const reconnectInterval = this.reconnectIntervals.get(sessionName);
      if (reconnectInterval) {
        clearTimeout(reconnectInterval);
        this.reconnectIntervals.delete(sessionName);
      }

      // Clean up token files
      const sessionDir = path.join(this.tokensDir, sessionName);
      if (fs.existsSync(sessionDir)) {
        try {
          fs.rmSync(sessionDir, { recursive: true, force: true });
          console.log(`🗂️ Cleaned up session directory: ${sessionDir}`);
        } catch (error) {
          console.error('Error cleaning session directory:', error);
        }
      }

      // Update database
      const instance = await prisma.whatsappInstance.findFirst({
        where: { name: sessionName },
      });

      if (instance) {
        await prisma.whatsappInstance.update({
          where: { id: instance.id },
          data: {
            status: 'DISCONNECTED',
            qrCode: null,
            updatedAt: new Date(),
          },
        });
      }

      console.log(`✅ Session ${sessionName} force destroyed completely`);
    } catch (error) {
      console.error('Error force destroying session:', error);
    }
  }
}
