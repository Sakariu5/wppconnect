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

import { WhatsAppService } from '../services/whatsappSimple';

// Example of how to initialize and use the WhatsApp service
async function exampleUsage() {
  const whatsappService = new WhatsAppService();
  // Example tenant and session details
  const tenantId = 'example-tenant-123';
  const sessionName = 'my-business-whatsapp';
  const userId = 'user-123';

  try {
    console.log('Starting WhatsApp session...');
    // Create a new session
    const client = await whatsappService.createSession(
      sessionName,
      tenantId,
      userId
    );
    // Wait for connection
    console.log('Waiting for WhatsApp to connect...');
    // Check if session is ready
    const isReady = await whatsappService.isSessionReady(sessionName);
    console.log('Session ready:', isReady);
    if (isReady) {
      // Get the phone number associated with this session
      const phone = await whatsappService.getSessionPhone(sessionName);
      console.log('Connected phone number:', phone);
      // Example: Send a text message
      const targetNumber = '1234567890@c.us'; // Replace with actual number
      // Send typing indicator
      await whatsappService.sendTyping(sessionName, targetNumber, true);
      // Wait a moment
      await new Promise((resolve) => setTimeout(resolve, 2000));
      // Stop typing and send message
      await whatsappService.sendTyping(sessionName, targetNumber, false);
      await whatsappService.sendMessage(
        sessionName,
        targetNumber,
        'Hello! This is a test message from the improved WhatsApp service.',
        'text'
      );
      console.log('Message sent successfully!');
      // Example: Send an image (uncomment if you have an image file)
      /*
      await whatsappService.sendMessage(
        sessionName,
        targetNumber,
        'Here is an image for you!',
        'image',
        '/path/to/your/image.jpg'
      );
      */
      // Get session token for backup
      const token = await whatsappService.getSessionToken(sessionName);
      console.log('Session token obtained for backup');
    }
  } catch (error) {
    console.error('Error in WhatsApp service:', error);
  }
}

// Example of handling automatic reconnection
function setupReconnectionExample() {
  const whatsappService = new WhatsAppService();
  // The service now automatically handles reconnections
  // when disconnections are detected through the handleDisconnection method
  console.log('WhatsApp service with auto-reconnection is ready');
  return whatsappService;
}

// Example of proper cleanup
async function cleanupExample() {
  const whatsappService = new WhatsAppService();
  const sessionName = 'my-business-whatsapp';
  // Properly destroy session when shutting down
  await whatsappService.destroySession(sessionName);
  console.log('Session cleaned up properly');
}

// Best practices for production usage:

/*
1. Session Management:
   - Use meaningful session names (e.g., tenant-specific names)
   - Always handle QR code display in your frontend
   - Monitor session status via WebSocket events

2. Error Handling:
   - Implement retry logic for failed messages
   - Handle rate limiting from WhatsApp
   - Log all errors for debugging

3. Message Types:
   - Use appropriate message types (text, image, document, etc.)
   - Validate file paths and URLs before sending
   - Implement message queuing for high-volume scenarios

4. Performance:
   - Don't create too many concurrent sessions
   - Use the phone watchdog for connection monitoring
   - Implement proper session cleanup

5. Security:
   - Store session tokens securely
   - Validate all incoming message data
   - Implement proper access controls for your API endpoints

6. Monitoring:
   - Use the WebSocket events to update your frontend in real-time
   - Implement health checks for active sessions
   - Monitor message delivery status
*/

export { exampleUsage, setupReconnectionExample, cleanupExample };
