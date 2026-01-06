const { sendMessage } = require('./automation/whatsapp_worker');
const sql = require('./db');

const automationService = {
  // The sendMessage function from whatsapp_worker.js is the actual delivery mechanism
  deliver: sendMessage
};

// In-memory queue for messages currently being processed
const processingQueue = new Set();

// --- Core Scheduler Logic ---

/**
 * The main job scheduler loop. Runs periodically to check for due messages.
 * Uses postgres to query the database for scheduled messages.
 */
async function runScheduler() {
  const now = new Date();

  try {
    // 1. Find messages that are due
    const messagesToDeliver = await sql`
      SELECT 
        id,
        user_id,
        phone_number,
        message_content
      FROM messages
      WHERE status = 'SCHEDULED'
        AND scheduled_at <= ${now}
      ORDER BY scheduled_at ASC
    `;

    // Filtrar mensagens que já estão sendo processadas
    const availableMessages = messagesToDeliver.filter(
      msg => !processingQueue.has(msg.id)
    );

    if (availableMessages.length > 0) {
      console.log(`[SCHEDULER] Found ${availableMessages.length} messages due for delivery.`);
    }

    // 2. Process each due message
    for (const message of availableMessages) {
      // Mark as processing to prevent double-delivery
      processingQueue.add(message.id);

      // Prepare message object for worker
      const messageForWorker = {
        id: message.id,
        userId: message.user_id,
        phoneNumber: message.phone_number,
        messageContent: message.message_content
      };

      // Deliver the message
      automationService.deliver(messageForWorker)
        .then(async (finalStatus) => {
          // 3. Update status after delivery attempt
          const dbStatus = finalStatus === 'Sent successfully' ? 'SENT' : 'FAILED';
          
          await sql`
            UPDATE messages
            SET status = ${dbStatus}
            WHERE id = ${message.id}
          `;

          processingQueue.delete(message.id);
          console.log(`[SCHEDULER] Message ${message.id} final status: ${dbStatus}`);
        })
        .catch(async (error) => {
          // Handle unexpected worker failure
          await sql`
            UPDATE messages
            SET status = 'FAILED'
            WHERE id = ${message.id}
          `;

          processingQueue.delete(message.id);
          console.error(`[SCHEDULER] Worker error for message ${message.id}:`, error);
        });
    }
  } catch (error) {
    console.error('[SCHEDULER] Error in scheduler loop:', error);
  }
}

// --- Public Interface ---

let schedulerInterval = null;

function startScheduler() {
  // Run the scheduler every 10 seconds
  schedulerInterval = setInterval(() => runScheduler(), 10000);
  console.log('[SCHEDULER] Job scheduler started. Running every 10 seconds.');
  
  // Run immediately on start
  runScheduler();
}

function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    console.log('[SCHEDULER] Job scheduler stopped.');
  }
}

function scheduleMessage(message) {
  console.log(`[SCHEDULER] Message ${message.id} added to the queue.`);
}

function cancelMessage(message) {
  // Remove from processing queue if it was being processed
  processingQueue.delete(message.id);
  console.log(`[SCHEDULER] Message ${message.id} canceled.`);
}

module.exports = {
  startScheduler,
  stopScheduler,
  scheduleMessage,
  cancelMessage,
};
