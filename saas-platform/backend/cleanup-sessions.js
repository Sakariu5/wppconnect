#!/usr/bin/env node

/*
 * Database cleanup script for WhatsApp sessions
 * Run this when you have problematic sessions that need to be reset
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanupWhatsAppSessions() {
  try {
    console.log('🔧 Starting WhatsApp sessions cleanup...');

    // 1. Show current sessions
    const allSessions = await prisma.whatsappInstance.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        tenantId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log('\n📋 Current WhatsApp Sessions:');
    console.table(allSessions);

    // 2. Find problematic sessions
    const problemSessions = await prisma.whatsappInstance.findMany({
      where: {
        OR: [
          { status: 'ERROR' },
          { status: 'CONNECTING' },
          { qrCode: { not: null } },
        ],
      },
    });

    if (problemSessions.length > 0) {
      console.log(`\n⚠️  Found ${problemSessions.length} problematic sessions:`);
      console.table(problemSessions.map(s => ({
        id: s.id,
        name: s.name,
        status: s.status,
        hasQR: !!s.qrCode,
      })));

      // Reset problematic sessions
      const resetResult = await prisma.whatsappInstance.updateMany({
        where: {
          id: { in: problemSessions.map(s => s.id) },
        },
        data: {
          status: 'DISCONNECTED',
          qrCode: null,
          sessionData: null,
          updatedAt: new Date(),
        },
      });

      console.log(`✅ Reset ${resetResult.count} problematic sessions`);
    } else {
      console.log('\n✅ No problematic sessions found');
    }

    // 3. Optional: Clean up very old sessions (uncomment if needed)
    /*
    const oldSessions = await prisma.whatsappInstance.findMany({
      where: {
        createdAt: {
          lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        },
        status: 'DISCONNECTED',
      },
    });

    if (oldSessions.length > 0) {
      console.log(`\n🗑️  Found ${oldSessions.length} old disconnected sessions`);
      console.log('Uncomment the delete code if you want to remove them');
      
      // await prisma.whatsappInstance.deleteMany({
      //   where: {
      //     id: { in: oldSessions.map(s => s.id) },
      //   },
      // });
    }
    */

    console.log('\n🎉 Cleanup completed successfully!');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Helper function to delete specific session by name
async function deleteSessionByName(sessionName, tenantId) {
  try {
    const session = await prisma.whatsappInstance.findFirst({
      where: { name: sessionName, tenantId },
    });

    if (session) {
      await prisma.whatsappInstance.delete({
        where: { id: session.id },
      });
      console.log(`✅ Deleted session: ${sessionName}`);
    } else {
      console.log(`❌ Session not found: ${sessionName}`);
    }
  } catch (error) {
    console.error('❌ Error deleting session:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Check command line arguments
const args = process.argv.slice(2);

if (args[0] === 'delete' && args[1] && args[2]) {
  // Usage: node cleanup-sessions.js delete "session-name" "tenant-id"
  deleteSessionByName(args[1], args[2]);
} else if (args[0] === 'help') {
  console.log(`
WhatsApp Sessions Cleanup Tool

Usage:
  node cleanup-sessions.js                    # General cleanup
  node cleanup-sessions.js delete NAME ID     # Delete specific session
  node cleanup-sessions.js help               # Show this help

Examples:
  node cleanup-sessions.js
  node cleanup-sessions.js delete "my-session" "tenant-123"
  `);
} else {
  // Default: run general cleanup
  cleanupWhatsAppSessions();
}
