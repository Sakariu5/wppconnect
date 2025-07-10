const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkMessages() {
  try {
    console.log('🔍 Checking messages in database...');
    
    // Check all messages
    const allMessages = await prisma.message.findMany({
      include: {
        conversation: {
          include: {
            whatsappInstance: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    console.log('📊 Total messages found:', allMessages.length);
    
    allMessages.forEach((msg, index) => {
      console.log(`\n📱 Message ${index + 1}:`);
      console.log('  ID:', msg.id);
      console.log('  Content:', msg.content);
      console.log('  Type:', msg.messageType);
      console.log('  From bot:', msg.isFromBot);
      console.log('  Created:', msg.createdAt);
      console.log('  Contact Phone:', msg.conversation.contactPhone);
      console.log('  Contact Name:', msg.conversation.contactName);
      console.log('  Instance Name:', msg.conversation.whatsappInstance?.name);
      console.log('  Instance ID:', msg.conversation.whatsappInstance?.id);
      console.log('  Tenant ID:', msg.conversation.whatsappInstance?.tenantId);
      
      if (msg.metadata) {
        try {
          const metadata = JSON.parse(msg.metadata);
          console.log('  Metadata:', metadata);
        } catch (e) {
          console.log('  Metadata (raw):', msg.metadata);
        }
      }
    });

    // Check conversations
    const conversations = await prisma.conversation.findMany({
      include: {
        whatsappInstance: true,
        _count: {
          select: { messages: true }
        }
      }
    });

    console.log('\n💬 Conversations:');
    conversations.forEach((conv) => {
      console.log(`  ID: ${conv.id}`);
      console.log(`  Phone: ${conv.contactPhone}`);
      console.log(`  Name: ${conv.contactName}`);
      console.log(`  Instance: ${conv.whatsappInstance?.name}`);
      console.log(`  Tenant: ${conv.whatsappInstance?.tenantId}`);
      console.log(`  Messages count: ${conv._count.messages}`);
      console.log('  ---');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMessages();
