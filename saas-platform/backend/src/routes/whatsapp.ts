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

    const instance = await prisma.whatsappInstance.findFirst({
      where: {
        id,
        tenantId: req.tenant!.id,
      },
    });

    if (!instance) {
      return res.status(404).json({ error: 'WhatsApp instance not found' });
    }

    // Start WhatsApp session
    await whatsAppService.createSession(
      instance.name,
      req.tenant!.id,
      req.user!.id
    );

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

    const instance = await prisma.whatsappInstance.findFirst({
      where: {
        id,
        tenantId: req.tenant!.id,
      },
    });

    if (!instance) {
      return res.status(404).json({ error: 'WhatsApp instance not found' });
    }

    res.json({
      qrCode: instance.qrCode,
      status: instance.status,
    });
  } catch (error) {
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

export default router;
