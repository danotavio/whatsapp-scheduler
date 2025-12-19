const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

// Base directory for storing user session data
const SESSION_DIR = path.join(__dirname, 'sessions');

/**
 * Ensures the session directory exists.
 */
async function setupSessionDir() {
    await fs.mkdir(SESSION_DIR, { recursive: true });
}

/**
 * Initializes a browser session for a specific user.
 * This function is critical for the "browser closed" requirement, as it maintains
 * the WhatsApp Web login state persistently.
 * @param {number} userId - The ID of the user.
 * @returns {Promise<object>} - An object containing the browser and context.
 */
async function initializeSession(userId) {
    const userDataDir = path.join(SESSION_DIR, `user_${userId}`);
    await fs.mkdir(userDataDir, { recursive: true });

    const browser = await chromium.launchPersistentContext(userDataDir, {
        headless: true, // Run in headless mode on the server
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.goto('https://web.whatsapp.com/', { waitUntil: 'networkidle' });

    // Check if the user is logged in (by looking for the main chat list element)
    const isLoggedIn = await page.waitForSelector('#pane-side', { timeout: 15000 }).catch(() => false);

    if (!isLoggedIn) {
        console.log(`[WORKER] User ${userId} is not logged in. Waiting for QR code scan...`);
        // In a real application, you would capture the QR code image and send it to the user
        // via a dedicated API endpoint for them to scan.
        // For this MVP, we will assume the user has already logged in manually.
        // The implementation here will just wait for the login to happen.
        await page.waitForSelector('#pane-side', { timeout: 60000 }); // Wait up to 60 seconds for manual login
        console.log(`[WORKER] User ${userId} successfully logged in.`);
    }

    return { browser, page };
}

/**
 * Sends a single WhatsApp message.
 * @param {object} message - The message object from the scheduler.
 * @returns {Promise<string>} - The final status ('Sent successfully' or 'Failed').
 */
async function sendMessage(message) {
    const { id, userId, phoneNumber, messageContent } = message;
    let status = 'Failed';
    let session;

    try {
        // 1. Initialize or resume the user's persistent session
        session = await initializeSession(userId);
        const { page } = session;

        // 2. Navigate to the chat for the phone number
        // WhatsApp Web URL format for direct chat: https://web.whatsapp.com/send?phone=<number>&text=<message>
        // However, using the search bar is more robust for automation.
        
        // Use the direct link for simplicity in the MVP, which is generally reliable
        await page.goto(`https://web.whatsapp.com/send?phone=${phoneNumber.replace('+', '')}`, { waitUntil: 'networkidle' });

        // 3. Wait for the chat to load and the message input box to appear
        const inputSelector = 'div[title="Type a message"]';
        await page.waitForSelector(inputSelector, { timeout: 20000 });

        // 4. Type the message content
        await page.type(inputSelector, messageContent, { delay: 50 }); // Human-like typing delay

        // 5. Click the send button (assuming the button is visible after typing)
        const sendButtonSelector = 'span[data-icon="send"]';
        await page.click(sendButtonSelector);

        // 6. Wait for a short period to confirm the message was sent (no explicit confirmation element is reliable)
        await page.waitForTimeout(3000);

        console.log(`[WORKER] Message ${id} to ${phoneNumber} successfully sent.`);
        status = 'Sent successfully';

    } catch (error) {
        console.error(`[WORKER] Error sending message ${id} to ${phoneNumber}:`, error.message);
        status = 'Failed';
    } finally {
        // 7. Close the page, but keep the browser context open to maintain the session state
        if (session && session.page) {
            await session.page.close();
        }
        // Note: We do NOT close the browser context (browser) to keep the session persistent.
        // In a production environment, a dedicated process manager would handle these persistent contexts.
    }

    return status;
}

async function sendWhatsAppMessage({ phone, message }) {
    console.log('📨 Simulating WhatsApp send');
    console.log('To:', phone);
    console.log('Message:', message);
  
    // MVP: simulação de envio
    return {
      success: true,
      sentAt: new Date()
    };
  }
  
 
// Export the function that the scheduler will call
module.exports = {
    setupSessionDir,
    sendMessage,
    sendWhatsAppMessage
};
