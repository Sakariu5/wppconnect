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
import Joi from 'joi';

const router = express.Router();
const prisma = new PrismaClient();

// Validation schemas
const createChatbotSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().optional(),
  triggerType: Joi.string()
    .valid('KEYWORD', 'EXACT_MESSAGE', 'TIME_BASED', 'WELCOME')
    .required(),
  triggerValue: Joi.string().required(),
  welcomeMessage: Joi.string().optional(),
  fallbackMessage: Joi.string().optional(),
  handoffToHuman: Joi.boolean().default(false),
  whatsappInstanceId: Joi.string().required(),
});

const createFlowSchema = Joi.object({
  name: Joi.string().required(),
  stepOrder: Joi.number().integer().min(1).required(),
  stepType: Joi.string()
    .valid('TRIGGER', 'RESPONSE', 'CONDITION', 'HANDOFF')
    .required(),
  triggerCondition: Joi.string().optional(),
  responseType: Joi.string()
    .valid('TEXT', 'IMAGE', 'DOCUMENT', 'BUTTON', 'LIST', 'LOCATION')
    .required(),
  responseContent: Joi.string().required(),
  responseMedia: Joi.string().optional(),
  buttons: Joi.array().optional(),
  listItems: Joi.array().optional(),
  conditions: Joi.array().optional(),
  nextStepId: Joi.string().optional(),
});

// Get all chatbots for tenant
router.get('/', async (req: TenantRequest, res) => {
  try {
    const chatbots = await prisma.chatbot.findMany({
      where: { tenantId: req.tenant!.id },
      include: {
        whatsappInstance: {
          select: {
            id: true,
            sessionName: true,
            status: true,
            phoneNumber: true,
          },
        },
        flows: {
          orderBy: { stepOrder: 'asc' },
        },
        _count: {
          select: {
            conversations: true,
            flows: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(chatbots);
  } catch (error) {
    console.error('Error fetching chatbots:', error);
    res.status(500).json({ error: 'Failed to fetch chatbots' });
  }
});

// Get single chatbot
router.get('/:id', async (req: TenantRequest, res) => {
  try {
    const { id } = req.params;

    const chatbot = await prisma.chatbot.findFirst({
      where: {
        id,
        tenantId: req.tenant!.id,
      },
      include: {
        whatsappInstance: true,
        flows: {
          orderBy: { stepOrder: 'asc' },
        },
        analytics: {
          orderBy: { date: 'desc' },
          take: 30,
        },
      },
    });

    if (!chatbot) {
      return res.status(404).json({ error: 'Chatbot not found' });
    }

    res.json(chatbot);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch chatbot' });
  }
});

// Create new chatbot
router.post('/', async (req: TenantRequest, res) => {
  try {
    const { error, value } = createChatbotSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const {
      name,
      description,
      triggerType,
      triggerValue,
      welcomeMessage,
      fallbackMessage,
      handoffToHuman,
      whatsappInstanceId,
    } = value;

    // Verify WhatsApp instance belongs to tenant
    const whatsappInstance = await prisma.whatsappInstance.findFirst({
      where: {
        id: whatsappInstanceId,
        tenantId: req.tenant!.id,
      },
    });

    if (!whatsappInstance) {
      return res.status(400).json({ error: 'Invalid WhatsApp instance' });
    }

    const chatbot = await prisma.chatbot.create({
      data: {
        name,
        description,
        triggerType,
        triggerValue,
        welcomeMessage,
        fallbackMessage,
        handoffToHuman,
        userId: req.user!.id,
        tenantId: req.tenant!.id,
        whatsappInstanceId,
      },
      include: {
        whatsappInstance: {
          select: {
            id: true,
            sessionName: true,
            status: true,
            phoneNumber: true,
          },
        },
      },
    });

    res.status(201).json(chatbot);
  } catch (error) {
    console.error('Error creating chatbot:', error);
    res.status(500).json({ error: 'Failed to create chatbot' });
  }
});

// Update chatbot
router.put('/:id', async (req: TenantRequest, res) => {
  try {
    const { id } = req.params;
    const { error, value } = createChatbotSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const chatbot = await prisma.chatbot.findFirst({
      where: {
        id,
        tenantId: req.tenant!.id,
      },
    });

    if (!chatbot) {
      return res.status(404).json({ error: 'Chatbot not found' });
    }

    const updatedChatbot = await prisma.chatbot.update({
      where: { id },
      data: {
        ...value,
        updatedAt: new Date(),
      },
      include: {
        whatsappInstance: {
          select: {
            id: true,
            sessionName: true,
            status: true,
            phoneNumber: true,
          },
        },
        flows: {
          orderBy: { stepOrder: 'asc' },
        },
      },
    });

    res.json(updatedChatbot);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update chatbot' });
  }
});

// Toggle chatbot active status
router.patch('/:id/toggle', async (req: TenantRequest, res) => {
  try {
    const { id } = req.params;

    const chatbot = await prisma.chatbot.findFirst({
      where: {
        id,
        tenantId: req.tenant!.id,
      },
    });

    if (!chatbot) {
      return res.status(404).json({ error: 'Chatbot not found' });
    }

    const updatedChatbot = await prisma.chatbot.update({
      where: { id },
      data: { isActive: !chatbot.isActive },
    });

    res.json(updatedChatbot);
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle chatbot status' });
  }
});

// Delete chatbot
router.delete('/:id', async (req: TenantRequest, res) => {
  try {
    const { id } = req.params;

    const chatbot = await prisma.chatbot.findFirst({
      where: {
        id,
        tenantId: req.tenant!.id,
      },
    });

    if (!chatbot) {
      return res.status(404).json({ error: 'Chatbot not found' });
    }

    await prisma.chatbot.delete({
      where: { id },
    });

    res.json({ message: 'Chatbot deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete chatbot' });
  }
});

// Get chatbot flows
router.get('/:id/flows', async (req: TenantRequest, res) => {
  try {
    const { id } = req.params;

    const chatbot = await prisma.chatbot.findFirst({
      where: {
        id,
        tenantId: req.tenant!.id,
      },
    });

    if (!chatbot) {
      return res.status(404).json({ error: 'Chatbot not found' });
    }

    const flows = await prisma.botFlow.findMany({
      where: { chatbotId: id },
      orderBy: { stepOrder: 'asc' },
    });

    res.json(flows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch flows' });
  }
});

// Create chatbot flow
router.post('/:id/flows', async (req: TenantRequest, res) => {
  try {
    const { id } = req.params;
    const { error, value } = createFlowSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const chatbot = await prisma.chatbot.findFirst({
      where: {
        id,
        tenantId: req.tenant!.id,
      },
    });

    if (!chatbot) {
      return res.status(404).json({ error: 'Chatbot not found' });
    }

    const flow = await prisma.botFlow.create({
      data: {
        ...value,
        chatbotId: id,
      },
    });

    res.status(201).json(flow);
  } catch (error) {
    console.error('Error creating flow:', error);
    res.status(500).json({ error: 'Failed to create flow' });
  }
});

// Update chatbot flow
router.put('/:id/flows/:flowId', async (req: TenantRequest, res) => {
  try {
    const { id, flowId } = req.params;
    const { error, value } = createFlowSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Verify chatbot belongs to tenant
    const chatbot = await prisma.chatbot.findFirst({
      where: {
        id,
        tenantId: req.tenant!.id,
      },
    });

    if (!chatbot) {
      return res.status(404).json({ error: 'Chatbot not found' });
    }

    const flow = await prisma.botFlow.findFirst({
      where: {
        id: flowId,
        chatbotId: id,
      },
    });

    if (!flow) {
      return res.status(404).json({ error: 'Flow not found' });
    }

    const updatedFlow = await prisma.botFlow.update({
      where: { id: flowId },
      data: value,
    });

    res.json(updatedFlow);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update flow' });
  }
});

// Delete chatbot flow
router.delete('/:id/flows/:flowId', async (req: TenantRequest, res) => {
  try {
    const { id, flowId } = req.params;

    // Verify chatbot belongs to tenant
    const chatbot = await prisma.chatbot.findFirst({
      where: {
        id,
        tenantId: req.tenant!.id,
      },
    });

    if (!chatbot) {
      return res.status(404).json({ error: 'Chatbot not found' });
    }

    const flow = await prisma.botFlow.findFirst({
      where: {
        id: flowId,
        chatbotId: id,
      },
    });

    if (!flow) {
      return res.status(404).json({ error: 'Flow not found' });
    }

    await prisma.botFlow.delete({
      where: { id: flowId },
    });

    res.json({ message: 'Flow deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete flow' });
  }
});

export default router;
