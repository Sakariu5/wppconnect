/*
 * Script temporal para crear datos de prueba en la base de datos
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestData() {
  console.log('🧪 Creating test data...');

  try {
    // Find first tenant
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) {
      console.log('❌ No tenant found');
      return;
    }

    console.log(`📋 Using tenant: ${tenant.name}`);

    // Find first instance for this tenant
    const instance = await prisma.whatsappInstance.findFirst({
      where: { tenantId: tenant.id },
    });

    if (!instance) {
      console.log('❌ No WhatsApp instance found');
      return;
    }

    console.log(`📱 Using instance: ${instance.name}`);

    // Find or create a default chatbot
    let chatbot = await prisma.chatbot.findFirst({
      where: {
        whatsappInstanceId: instance.id,
        tenantId: tenant.id,
      },
    });

    if (!chatbot) {
      chatbot = await prisma.chatbot.create({
        data: {
          name: `Bot Test ${instance.name}`,
          description: 'Chatbot de prueba',
          tenantId: tenant.id,
          whatsappInstanceId: instance.id,
          welcomeMessage: 'Hola! ¿En qué puedo ayudarte?',
        },
      });
      console.log(`🤖 Created chatbot: ${chatbot.name}`);
    } else {
      console.log(`🤖 Using existing chatbot: ${chatbot.name}`);
    }

    // Create test conversations and messages
    const testContacts = [
      { phone: '5215551234567', name: 'Usuario de Prueba 1' },
      { phone: '5215559876543', name: 'Cliente VIP' },
      { phone: '5215551111111', name: 'Support Request' },
    ];

    const testMessagesBatch = [
      [
        'Hola, necesito ayuda con un pedido',
        'Mi número de orden es #12345',
        '¿Podrían verificar el estado?',
        'Gracias por la atención',
      ],
      [
        'Buenos días',
        'Tengo una consulta sobre facturación',
        'El RFC está correcto en mi última factura?',
        'Perfecto, muchas gracias',
      ],
      [
        'Urgente: problema con entrega',
        'El pedido no llegó en la fecha prometida',
        'Necesito actualización inmediata',
        'Por favor confirmen nueva fecha',
        'Gracias por su pronta respuesta',
      ],
    ];

    for (let i = 0; i < testContacts.length; i++) {
      const contact = testContacts[i];
      const messages = testMessagesBatch[i];

      // Create conversation
      const conversation = await prisma.conversation.create({
        data: {
          contactPhone: contact.phone,
          contactName: contact.name,
          whatsappInstanceId: instance.id,
          chatbotId: chatbot.id,
          status: 'ACTIVE',
        },
      });

      console.log(`💬 Created conversation with ${contact.name}`);

      // Create messages
      for (let j = 0; j < messages.length; j++) {
        await prisma.message.create({
          data: {
            content: messages[j],
            messageType: 'chat',
            isFromBot: false,
            conversationId: conversation.id,
            metadata: JSON.stringify({
              originalMessageId: `test_${Date.now()}_${i}_${j}`,
              from: `${contact.phone}@c.us`,
              timestamp: new Date(Date.now() - (messages.length - j) * 60000 - i * 300000), // spread across time
              isGroupMessage: false,
              hasMedia: false,
            }),
          },
        });
      }

      console.log(`📝 Created ${messages.length} messages for ${contact.name}`);
    }

    console.log('✅ Test data created successfully!');
  } catch (error) {
    console.error('❌ Error creating test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestData();
