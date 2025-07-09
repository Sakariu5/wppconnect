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
import { PrismaClient } from '@prisma/client';
import { TenantRequest } from '../middleware/tenant';
import { WhatsAppService } from '../services/whatsappSimple';

const router = express.Router();
const prisma = new PrismaClient();
const whatsAppService = new WhatsAppService();

// Get WhatsApp instances for tenant
router.get('/instances', async (req: TenantRequest, res) => {
  try {
    const instances = await prisma.whatsappInstance.findMany({
      where: { tenantId: req.tenant!.id },
      orderBy: { createdAt: 'desc' },
    });

    res.json(instances);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch WhatsApp instances' });
  }
});

// Create new WhatsApp instance
router.post('/instances', async (req: TenantRequest, res) => {
  try {
    const { sessionName } = req.body;

    if (!sessionName) {
      return res.status(400).json({ error: 'Session name is required' });
    }

    // Check if session already exists
    const existingInstance = await prisma.whatsappInstance.findFirst({
      where: {
        name: sessionName,
        tenantId: req.tenant!.id,
      },
    });

    if (existingInstance) {
      return res.status(400).json({ error: 'Session name already exists' });
    }

    // Create instance in database
    const instance = await prisma.whatsappInstance.create({
      data: {
        name: sessionName,
        tenantId: req.tenant!.id,
        status: 'DISCONNECTED',
      },
    });

    res.status(201).json(instance);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create WhatsApp instance' });
  }
});

// Connect WhatsApp instance
router.post('/instances/:id/connect', async (req: TenantRequest, res) => {
  try {
    const { id } = req.params;
    console.log(`🔌 Attempting to connect WhatsApp instance: ${id}`);

    const instance = await prisma.whatsappInstance.findFirst({
      where: {
        id,
        tenantId: req.tenant!.id,
      },
    });

    if (!instance) {
      console.log(`❌ WhatsApp instance not found: ${id}`);
      return res.status(404).json({ error: 'WhatsApp instance not found' });
    }

    console.log(`✅ Found instance: ${instance.name}, starting session...`);
    
    // Start WhatsApp session
    await whatsAppService.createSession(
      instance.name,
      req.tenant!.id,
      req.user!.id
    );

    console.log(`🚀 Session creation initiated for: ${instance.name}`);
    
    res.json({
      message: 'Connection started',
      sessionName: instance.name,
    });
  } catch (error) {
    console.error('Connection error:', error);
    res.status(500).json({ error: 'Failed to connect WhatsApp instance' });
  }
});

// Disconnect WhatsApp instance
router.post('/instances/:id/disconnect', async (req: TenantRequest, res) => {
  try {
    const { id } = req.params;

    const instance = await prisma.whatsappInstance.findFirst({
      where: {
        id,
        tenantId: req.tenant!.id,
      },
    });

    if (!instance) {
      return res.status(404).json({ error: 'WhatsApp instance not found' });
    }

    // Destroy WhatsApp session
    await whatsAppService.destroySession(instance.name);

    res.json({ message: 'Disconnected successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to disconnect WhatsApp instance' });
  }
});

// Get QR code for instance
router.get('/instances/:id/qr', async (req: TenantRequest, res) => {
  try {
    const { id } = req.params;
    console.log(`📱 Polling QR code for instance: ${id}`);

    const instance = await prisma.whatsappInstance.findFirst({
      where: {
        id,
        tenantId: req.tenant!.id,
      },
    });

    if (!instance) {
      console.log(`❌ Instance not found for QR polling: ${id}`);
      return res.status(404).json({ error: 'WhatsApp instance not found' });
    }

    console.log(
      `📊 Instance status: ${instance.status}, QR exists: ${!!instance.qrCode}`
    );
    
    res.json({
      qrCode: instance.qrCode,
      status: instance.status,
    });
  } catch (error) {
    console.error('Error getting QR code:', error);
    res.status(500).json({ error: 'Failed to get QR code' });
  }
});

// Send test message
router.post('/instances/:id/send-message', async (req: TenantRequest, res) => {
  try {
    const { id } = req.params;
    const { to, message, type = 'text' } = req.body;

    if (!to || !message) {
      return res
        .status(400)
        .json({ error: 'Recipient and message are required' });
    }

    const instance = await prisma.whatsappInstance.findFirst({
      where: {
        id,
        tenantId: req.tenant!.id,
      },
    });

    if (!instance) {
      return res.status(404).json({ error: 'WhatsApp instance not found' });
    }

    if (instance.status !== 'CONNECTED') {
      return res
        .status(400)
        .json({ error: 'WhatsApp instance is not connected' });
    }

    // Send message
    const result = await whatsAppService.sendMessage(
      instance.name,
      to,
      message,
      type
    );

    res.json({
      message: 'Message sent successfully',
      result,
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Delete WhatsApp instance
router.delete('/instances/:id', async (req: TenantRequest, res) => {
  try {
    const { id } = req.params;

    const instance = await prisma.whatsappInstance.findFirst({
      where: {
        id,
        tenantId: req.tenant!.id,
      },
    });

    if (!instance) {
      return res.status(404).json({ error: 'WhatsApp instance not found' });
    }

    // Disconnect if connected
    if (instance.status === 'CONNECTED') {
      await whatsAppService.destroySession(instance.name);
    }

    // Delete from database
    await prisma.whatsappInstance.delete({
      where: { id },
    });

    res.json({ message: 'WhatsApp instance deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete WhatsApp instance' });
  }
});

// Get all WhatsApp instances with their current status
router.get('/instances/status', async (req: TenantRequest, res) => {
  try {
    console.log(
      `📋 Getting all instances status for tenant: ${req.tenant!.id}`
    );
    
    const instances = await prisma.whatsappInstance.findMany({
      where: { tenantId: req.tenant!.id },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        phone: true,
        status: true,
        updatedAt: true,
        createdAt: true,
      },
    });

    console.log(`📊 Found ${instances.length} instances`);
    instances.forEach((instance) => {
      console.log(
        `   - ${instance.name}: ${instance.status} (${
          instance.phone || 'No phone'
        })`
      );
    });

    res.json(instances);
  } catch (error) {
    console.error('Error getting instances status:', error);
    res.status(500).json({ error: 'Failed to get instances status' });
  }
});

// Get detailed session information
router.get('/instances/:id/session-info', async (req: TenantRequest, res) => {
  try {
    const { id } = req.params;
    console.log(`📱 Getting detailed session info for instance: ${id}`);

    const instance = await prisma.whatsappInstance.findFirst({
      where: {
        id,
        tenantId: req.tenant!.id,
      },
    });

    if (!instance) {
      return res.status(404).json({ error: 'WhatsApp instance not found' });
    }

    // Get detailed session information if connected
    let sessionInfo: any = {
      basic: {
        id: instance.id,
        name: instance.name,
        phone: instance.phone,
        status: instance.status,
        createdAt: instance.createdAt,
        updatedAt: instance.updatedAt,
      },
    };

    if (instance.status === 'CONNECTED') {
      try {
        const connection = whatsAppService.getConnection(instance.name);
        if (connection) {
          console.log(`🔍 Getting detailed info for connected session: ${instance.name}`);

          // Get host device information
          try {
            const hostDevice = await connection.getHostDevice();
            sessionInfo.hostDevice = hostDevice;
          } catch (error) {
            console.error('Error getting host device:', error);
            sessionInfo.hostDevice = null;
          }

          // Get connection state
          try {
            const connectionState = await connection.getConnectionState();
            sessionInfo.connectionState = connectionState;
          } catch (error) {
            console.error('Error getting connection state:', error);
            sessionInfo.connectionState = null;
          }

          // Check if connected
          try {
            const isConnected = await connection.isConnected();
            sessionInfo.isConnected = isConnected;
          } catch (error) {
            console.error('Error checking connection:', error);
            sessionInfo.isConnected = false;
          }

          // Check if online
          try {
            const isOnline = await connection.isOnline();
            sessionInfo.isOnline = isOnline;
          } catch (error) {
            console.error('Error checking online status:', error);
            sessionInfo.isOnline = false;
          }

          // Check if authenticated
          try {
            const isAuthenticated = await connection.isAuthenticated();
            sessionInfo.isAuthenticated = isAuthenticated;
          } catch (error) {
            console.error('Error checking authentication:', error);
            sessionInfo.isAuthenticated = false;
          }

          // Check if logged in
          try {
            const isLoggedIn = await connection.isLoggedIn();
            sessionInfo.isLoggedIn = isLoggedIn;
          } catch (error) {
            console.error('Error checking login status:', error);
            sessionInfo.isLoggedIn = false;
          }

          // Get battery level
          try {
            const batteryLevel = await connection.getBatteryLevel();
            sessionInfo.batteryLevel = batteryLevel;
          } catch (error) {
            console.error('Error getting battery level:', error);
            sessionInfo.batteryLevel = null;
          }

          // Get WhatsApp version
          try {
            const waVersion = await connection.getWAVersion();
            sessionInfo.waVersion = waVersion;
          } catch (error) {
            console.error('Error getting WA version:', error);
            sessionInfo.waVersion = null;
          }

          // Check if multidevice
          try {
            const isMultiDevice = await connection.isMultiDevice();
            sessionInfo.isMultiDevice = isMultiDevice;
          } catch (error) {
            console.error('Error checking multidevice:', error);
            sessionInfo.isMultiDevice = null;
          }
        } else {
          console.log(`⚠️ No active connection found for session: ${instance.name}`);
          sessionInfo.error = 'No active connection found';
        }
      } catch (error) {
        console.error('Error getting session details:', error);
        sessionInfo.error = 'Failed to get session details';
      }
    }

    res.json(sessionInfo);
  } catch (error) {
    console.error('Error getting session info:', error);
    res.status(500).json({ error: 'Failed to get session information' });
  }
});

// Check if session is ready
router.get('/instances/:id/ready', async (req: TenantRequest, res) => {
  try {
    const { id } = req.params;

    const instance = await prisma.whatsappInstance.findFirst({
      where: {
        id,
        tenantId: req.tenant!.id,
      },
    });

    if (!instance) {
      return res.status(404).json({ error: 'WhatsApp instance not found' });
    }

    const isReady = await whatsAppService.isSessionReady(instance.name);
    
    res.json({
      instanceId: id,
      sessionName: instance.name,
      isReady,
      status: instance.status,
    });
  } catch (error) {
    console.error('Error checking session ready status:', error);
    res.status(500).json({ error: 'Failed to check session status' });
  }
});

// Get all active sessions information
router.get('/sessions/active', async (req: TenantRequest, res) => {
  try {
    console.log('📱 Getting all active sessions information');
    
    const activeSessions = await whatsAppService.getAllSessionsInfo();
    
    // Filter sessions for this tenant
    const tenantInstances = await prisma.whatsappInstance.findMany({
      where: { tenantId: req.tenant?.id },
      select: { name: true, id: true, phone: true, status: true }
    });

    const tenantSessionNames = tenantInstances.map(i => i.name);
    const filteredSessions = activeSessions.filter(session => 
      tenantSessionNames.includes(session.sessionName)
    );

    // Merge with database information
    const enrichedSessions = filteredSessions.map(session => {
      const dbInstance = tenantInstances.find(i => i.name === session.sessionName);
      return {
        ...session,
        instanceId: dbInstance?.id,
        dbStatus: dbInstance?.status,
        dbPhone: dbInstance?.phone,
      };
    });

    res.json({
      totalActiveSessions: whatsAppService.getActiveSessionNames().length,
      tenantSessions: enrichedSessions.length,
      sessions: enrichedSessions,
    });
  } catch (error) {
    console.error('Error getting active sessions:', error);
    res.status(500).json({ error: 'Failed to get active sessions' });
  }
});

export default router;
