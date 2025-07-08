import { Server } from 'socket.io';

export class WebSocketService {
  private io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  // Emit to specific tenant
  emitToTenant(tenantId: string, event: string, data: any) {
    this.io.to(`tenant-${tenantId}`).emit(event, data);
  }

  // Emit new message to tenant
  emitNewMessage(tenantId: string, conversationId: string, message: any) {
    this.emitToTenant(tenantId, 'new-message', {
      conversationId,
      message,
    });
  }

  // Emit conversation status change
  emitConversationStatus(
    tenantId: string,
    conversationId: string,
    status: string
  ) {
    this.emitToTenant(tenantId, 'conversation-status', {
      conversationId,
      status,
    });
  }

  // Emit WhatsApp connection status
  emitWhatsAppStatus(
    tenantId: string,
    instanceId: string,
    status: string,
    qrCode?: string
  ) {
    this.emitToTenant(tenantId, 'whatsapp-status', {
      instanceId,
      status,
      qrCode,
    });
  }

  // Emit bot analytics update
  emitAnalyticsUpdate(tenantId: string, analytics: any) {
    this.emitToTenant(tenantId, 'analytics-update', analytics);
  }

  // Emit typing indicator
  emitTyping(tenantId: string, conversationId: string, isTyping: boolean) {
    this.emitToTenant(tenantId, 'typing', {
      conversationId,
      isTyping,
    });
  }
}
