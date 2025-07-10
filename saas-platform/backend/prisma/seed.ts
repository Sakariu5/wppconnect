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
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create demo tenant
  const demoTenant = await prisma.tenant.upsert({
    where: { subdomain: 'demo' },
    update: {},
    create: {
      subdomain: 'demo',
      name: 'Demo Company',
      primaryColor: '#3B82F6',
      secondaryColor: '#1F2937',
      plan: 'PROFESSIONAL',
    },
  });

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      email: 'admin@demo.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      tenantId: demoTenant.id,
    },
  });

  // Create demo user
  const demoUserPassword = await bcrypt.hash('demo123', 10);

  const demoUser = await prisma.user.upsert({
    where: { email: 'user@demo.com' },
    update: {},
    create: {
      email: 'user@demo.com',
      password: demoUserPassword,
      firstName: 'Demo',
      lastName: 'User',
      role: 'USER',
      tenantId: demoTenant.id,
    },
  });

  // Create sample WhatsApp instance
  const whatsappInstance = await prisma.whatsappInstance.create({
    data: {
      sessionName: 'demo-session',
      status: 'DISCONNECTED',
      userId: demoUser.id,
      tenantId: demoTenant.id,
    },
  });

  // Create sample chatbot
  const chatbot = await prisma.chatbot.create({
    data: {
      name: 'Welcome Bot',
      description: 'Chatbot de bienvenida automático',
      triggerType: 'WELCOME',
      triggerValue: 'welcome',
      welcomeMessage:
        '¡Hola! 👋 Bienvenido a nuestro servicio. ¿En qué puedo ayudarte?',
      fallbackMessage: 'Lo siento, no entendí tu mensaje. ¿Podrías repetirlo?',
      userId: demoUser.id,
      tenantId: demoTenant.id,
      whatsappInstanceId: whatsappInstance.id,
    },
  });

  // Create sample bot flows
  await prisma.botFlow.createMany({
    data: [
      {
        name: 'Bienvenida',
        stepOrder: 1,
        stepType: 'TRIGGER',
        triggerCondition: 'welcome',
        responseType: 'TEXT',
        responseContent: '¡Hola! 👋 Bienvenido a nuestro servicio.',
        chatbotId: chatbot.id,
      },
      {
        name: 'Menú Principal',
        stepOrder: 2,
        stepType: 'RESPONSE',
        responseType: 'BUTTON',
        responseContent: '¿En qué puedo ayudarte?',
        buttons: [
          { id: 'info', title: 'Información' },
          { id: 'support', title: 'Soporte' },
          { id: 'human', title: 'Hablar con humano' },
        ],
        chatbotId: chatbot.id,
      },
    ],
  });

  console.log('✅ Seed completed successfully!');
  console.log('📊 Created:');
  console.log(`  - Tenant: ${demoTenant.name} (${demoTenant.subdomain})`);
  console.log(`  - Admin User: ${adminUser.email}`);
  console.log(`  - Demo User: ${demoUser.email}`);
  console.log(`  - WhatsApp Instance: ${whatsappInstance.sessionName}`);
  console.log(`  - Chatbot: ${chatbot.name}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
