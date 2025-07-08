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
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import rateLimit from 'express-rate-limit';

// Import routes
import authRoutes from './routes/auth';
import tenantRoutes from './routes/tenant';
import userRoutes from './routes/user';
import whatsappRoutes from './routes/whatsapp';
import chatbotRoutes from './routes/chatbot';
import conversationRoutes from './routes/conversation';
import analyticsRoutes from './routes/analytics';
import webhookRoutes from './routes/webhook';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import { tenantMiddleware } from './middleware/tenant';

// Import services
import { WebSocketService } from './services/websocket';
import { WhatsAppService } from './services/whatsapp';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin:
      process.env.NODE_ENV === 'production'
        ? ['https://*.yourdomain.com']
        : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'localhost';

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin:
      process.env.NODE_ENV === 'production'
        ? ['https://*.yourdomain.com']
        : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
  })
);

// General middleware
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/api/', limiter);

// Initialize WebSocket service
const webSocketService = new WebSocketService(io);

// Initialize WhatsApp service
const whatsAppService = new WhatsAppService();

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime(),
  });
});

// Webhook routes (no auth required)
app.use('/webhook', webhookRoutes);

// API routes with authentication and tenant middleware
app.use('/api/auth', authRoutes);
app.use('/api/tenant', authMiddleware, tenantMiddleware, tenantRoutes);
app.use('/api/users', authMiddleware, tenantMiddleware, userRoutes);
app.use('/api/whatsapp', authMiddleware, tenantMiddleware, whatsappRoutes);
app.use('/api/chatbots', authMiddleware, tenantMiddleware, chatbotRoutes);
app.use(
  '/api/conversations',
  authMiddleware,
  tenantMiddleware,
  conversationRoutes
);
app.use('/api/analytics', authMiddleware, tenantMiddleware, analyticsRoutes);

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use(errorHandler);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('join-tenant', (tenantId: string) => {
    socket.join(`tenant-${tenantId}`);
    console.log(`Socket ${socket.id} joined tenant ${tenantId}`);
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Start server
server.listen(Number(PORT), () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 WebSocket server ready`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

export { io };
