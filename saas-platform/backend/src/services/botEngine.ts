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
import { PrismaClient } from '@prisma/client';
import { WhatsAppService } from './whatsapp';

const prisma = new PrismaClient();

export class BotEngineService {
  async processMessage(
    message: any,
    conversation: any,
    chatbots: any[],
    whatsAppService: WhatsAppService
  ) {
    try {
      // Find matching chatbot based on triggers
      const matchingBot = await this.findMatchingBot(message, chatbots);

      if (!matchingBot) return;

      // Update conversation with chatbot
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { chatbotId: matchingBot.id },
      });

      // Process the bot flow
      await this.processBotFlow(
        matchingBot,
        message,
        conversation,
        whatsAppService
      );

      // Update analytics (commented out until Prisma client is regenerated)
      // await this.updateBotAnalytics(matchingBot.id, 'trigger');
    } catch (error) {
      console.error('Error processing message with bot engine:', error);
    }
  }

  private async findMatchingBot(message: any, chatbots: any[]) {
    const messageContent = message.body?.toLowerCase().trim() || '';

    for (const bot of chatbots) {
      if (!bot.isActive) continue;

      switch (bot.triggerType) {
        case 'KEYWORD':
          if (messageContent.includes(bot.triggerValue.toLowerCase())) {
            return bot;
          }
          break;

        case 'EXACT_MESSAGE':
          if (messageContent === bot.triggerValue.toLowerCase()) {
            return bot;
          }
          break;

        case 'WELCOME':
          // Always trigger on first message
          return bot;

        case 'TIME_BASED':
          // Implement time-based logic here
          break;
      }
    }

    return null;
  }

  private async processBotFlow(
    chatbot: any,
    message: any,
    conversation: any,
    whatsAppService: WhatsAppService
  ) {
    try {
      // Get bot flows ordered by step
      const flows = await prisma.botFlow.findMany({
        where: {
          chatbotId: chatbot.id,
          isActive: true,
        },
        orderBy: { stepOrder: 'asc' },
      });

      if (flows.length === 0) {
        // Send welcome message if no flows
        if (chatbot.welcomeMessage) {
          await this.sendBotMessage(
            whatsAppService,
            chatbot.whatsappInstance.sessionName,
            conversation.contactPhone,
            chatbot.welcomeMessage,
            conversation.id
          );
        }
        return;
      }

      // Start with first flow step
      await this.executeFlowStep(
        flows[0],
        flows,
        message,
        conversation,
        whatsAppService,
        chatbot
      );
    } catch (error) {
      console.error('Error processing bot flow:', error);
    }
  }

  private async executeFlowStep(
    currentStep: any,
    allSteps: any[],
    message: any,
    conversation: any,
    whatsAppService: WhatsAppService,
    chatbot: any
  ) {
    try {
      const sessionName = chatbot.whatsappInstance.sessionName;
      const contactPhone = conversation.contactPhone;

      switch (currentStep.stepType) {
        case 'RESPONSE':
          await this.executeResponseStep(
            currentStep,
            sessionName,
            contactPhone,
            conversation.id,
            whatsAppService
          );
          break;

        case 'CONDITION': {
          const nextStep = await this.evaluateCondition(
            currentStep,
            message,
            allSteps
          );
          if (nextStep) {
            await this.executeFlowStep(
              nextStep,
              allSteps,
              message,
              conversation,
              whatsAppService,
              chatbot
            );
          }
          break;
        }

        case 'HANDOFF':
          await this.handoffToHuman(
            conversation,
            whatsAppService,
            sessionName,
            contactPhone
          );
          break;
      }

      // Move to next step if specified
      if (currentStep.nextStepId) {
        const nextStep = allSteps.find((s) => s.id === currentStep.nextStepId);
        if (nextStep) {
          // Small delay between steps
          setTimeout(() => {
            this.executeFlowStep(
              nextStep,
              allSteps,
              message,
              conversation,
              whatsAppService,
              chatbot
            );
          }, 1000);
        }
      }
    } catch (error) {
      console.error('Error executing flow step:', error);
    }
  }

  private async executeResponseStep(
    step: any,
    sessionName: string,
    contactPhone: string,
    conversationId: string,
    whatsAppService: WhatsAppService
  ) {
    switch (step.responseType) {
      case 'TEXT':
        await this.sendBotMessage(
          whatsAppService,
          sessionName,
          contactPhone,
          step.responseContent,
          conversationId
        );
        break;

      case 'IMAGE':
        await whatsAppService.sendMessage(
          sessionName,
          contactPhone,
          step.responseContent,
          'image',
          step.responseMedia
        );
        break;

      case 'DOCUMENT':
        await whatsAppService.sendMessage(
          sessionName,
          contactPhone,
          step.responseContent,
          'document',
          step.responseMedia
        );
        break;

      case 'BUTTON':
        if (step.buttons) {
          await whatsAppService.sendButtons(
            sessionName,
            contactPhone,
            step.responseContent,
            step.buttons
          );
        }
        break;

      case 'LIST':
        if (step.listItems) {
          await whatsAppService.sendList(
            sessionName,
            contactPhone,
            step.responseContent,
            'Selecciona una opción',
            step.listItems
          );
        }
        break;
    }
  }

  private async evaluateCondition(step: any, message: any, allSteps: any[]) {
    if (!step.conditions) return null;

    const messageContent = message.body?.toLowerCase().trim() || '';
    const conditions = step.conditions;

    // Simple condition evaluation (can be expanded)
    for (const condition of conditions) {
      if (
        condition.type === 'contains' &&
        messageContent.includes(condition.value.toLowerCase())
      ) {
        return allSteps.find((s) => s.id === condition.nextStepId);
      }

      if (
        condition.type === 'equals' &&
        messageContent === condition.value.toLowerCase()
      ) {
        return allSteps.find((s) => s.id === condition.nextStepId);
      }
    }

    return null;
  }

  private async handoffToHuman(
    conversation: any,
    whatsAppService: WhatsAppService,
    sessionName: string,
    contactPhone: string
  ) {
    // Mark conversation as human-handled
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { isHuman: true },
    });

    // Send handoff message
    await this.sendBotMessage(
      whatsAppService,
      sessionName,
      contactPhone,
      'Te estoy conectando con un agente humano. Un momento por favor...',
      conversation.id
    );

    // Update analytics (commented out until Prisma client is regenerated)
    // if (conversation.chatbotId) {
    //   await this.updateBotAnalytics(conversation.chatbotId, 'handoff');
    // }
  }

  private async sendBotMessage(
    whatsAppService: WhatsAppService,
    sessionName: string,
    contactPhone: string,
    content: string,
    conversationId: string
  ) {
    try {
      // Send via WhatsApp
      await whatsAppService.sendMessage(sessionName, contactPhone, content);

      // Save to database
      await prisma.message.create({
        data: {
          content,
          messageType: 'TEXT',
          isFromBot: true,
          conversationId,
          // Removed whatsappInstanceId as it is not a valid property
        },
      });
    } catch (error) {
      console.error('Error sending bot message:', error);
    }
  }

  private async updateBotAnalytics(
    chatbotId: string,
    type: 'trigger' | 'completion' | 'handoff'
  ) {
    // Commented out until Prisma client is regenerated
    /*
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const analytics = await prisma.botAnalytics.upsert({
      where: {
        chatbotId_date: {
          chatbotId,
          date: today,
        },
      },
      update: {
        [type === 'trigger'
          ? 'triggers'
          : type === 'completion'
          ? 'completions'
          : 'handoffs']: {
          increment: 1,
        },
      },
      create: {
        chatbotId,
        date: today,
        triggers: type === 'trigger' ? 1 : 0,
        completions: type === 'completion' ? 1 : 0,
        handoffs: type === 'handoff' ? 1 : 0,
      },
    });
    */
    console.log(`Bot analytics would be updated: ${chatbotId}, type: ${type}`);
  }
}
