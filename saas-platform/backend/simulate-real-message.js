const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function simulateRealMessage() {
  try {
    console.log('🎬 Simulating real message arrival...');
    
    // Get an existing instance
    const instance = await prisma.whatsappInstance.findFirst();
    if (!instance) {
      console.log('❌ No instances found');
      return;
    }

    console.log('📱 Using instance:', {
      id: instance.id,
      name: instance.name,
      tenantId: instance.tenantId,
    });

    // Simulate a real message from a new phone number
    const fromPhone = '5219876543210';
    const messageContent = 'Este es un mensaje real de prueba - debería aparecer en el dashboard';

    // Find or create conversation
    let conversation = await prisma.conversation.findFirst({
      where: {
        contactPhone: fromPhone,
        whatsappInstanceId: instance.id,
      },
    });

    if (!conversation) {
      // Get or create a chatbot
      let chatbot = await prisma.chatbot.findFirst({
        where: {
          whatsappInstanceId: instance.id,
          tenantId: instance.tenantId,
        },
      });

      if (!chatbot) {
        chatbot = await prisma.chatbot.create({
          data: {
            name: `Bot ${instance.name}`,
            description: 'Chatbot creado automáticamente',
            tenantId: instance.tenantId,
            whatsappInstanceId: instance.id,
            welcomeMessage: 'Hola! ¿En qué puedo ayudarte?',
          },
        });
      }

      conversation = await prisma.conversation.create({
        data: {
          contactPhone: fromPhone,
          contactName: 'Usuario Real',
          whatsappInstanceId: instance.id,
          chatbotId: chatbot.id,
          status: 'ACTIVE',
        },
      });

      console.log('🆕 Created new conversation:', conversation.id);
    }

    // Store the message
    const newMessage = await prisma.message.create({
      data: {
        content: messageContent,
        messageType: 'chat',
        isFromBot: false,
        conversationId: conversation.id,
        metadata: JSON.stringify({
          originalMessageId: `real_${Date.now()}_message`,
          from: `${fromPhone}@c.us`,
          timestamp: new Date(),
          isGroupMessage: false,
          hasMedia: false,
          simulatedReal: true,
        }),
      },
    });

    console.log(
      `✅ Real message simulated and stored - ID: ${newMessage.id}, Content: "${newMessage.content}"`
    );

    console.log(
      '🎉 Simulation complete! The message should now appear in the dashboard.'
    );

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

simulateRealMessage();
