const { sendMessage } = require('./automation/whatsapp_worker');

const automationService = {
  // The sendMessage function from whatsapp_worker.js is the actual delivery mechanism
  deliver: sendMessage
};

// In-memory queue for messages currently being processed
const processingQueue = new Set();

// --- Core Scheduler Logic ---

/**
 * The main job scheduler loop. Runs periodically to check for due messages.
 * @param {Array} allMessages - Reference to the global messages array (mock DB).
 */
function runScheduler(allMessages) {
  const now = new Date();

  // 1. Find messages that are due and not already being processed
  const messagesToDeliver = allMessages.filter(msg =>
    msg.status === 'Scheduled' &&
    msg.scheduledDateTime <= now &&
    !processingQueue.has(msg.id)
  );

  if (messagesToDeliver.length > 0) {
    console.log(`[SCHEDULER] Found ${messagesToDeliver.length} messages due for delivery.`);
  }

  // 2. Process each due message
  messagesToDeliver.forEach(message => {
    // Mark as processing to prevent double-delivery
    processingQueue.add(message.id);
    message.status = 'Processing'; // Update status in mock DB

    // In a real system, this would be an API call to the dedicated Automation Worker service
    automationService.deliver(message)
      .then(finalStatus => {
        // 3. Update status after delivery attempt
        message.status = finalStatus;
        processingQueue.delete(message.id);
        console.log(`[SCHEDULER] Message ${message.id} final status: ${finalStatus}`);
      })
      .catch(error => {
        // Handle unexpected worker failure
        message.status = 'Failed (Worker Error)';
        processingQueue.delete(message.id);
        console.error(`[SCHEDULER] Worker error for message ${message.id}:`, error);
      });
  });
}

// --- Public Interface ---

let schedulerInterval = null;
let messagesReference = [];

function startScheduler(messages) {
  messagesReference = messages;
  // Run the scheduler every 10 seconds for the MVP demo
  schedulerInterval = setInterval(() => runScheduler(messagesReference), 10000);
  console.log('[SCHEDULER] Job scheduler started. Running every 10 seconds.');
}

function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    console.log('[SCHEDULER] Job scheduler stopped.');
  }
}

function scheduleMessage(message) {
  // In a real system, this would add the message to a persistent queue (e.g., Redis, SQS)
  console.log(`[SCHEDULER] Message ${message.id} added to the queue.`);
}

function cancelMessage(message) {
  // Remove from processing queue if it was being processed
  processingQueue.delete(message.id);
  console.log(`[SCHEDULER] Message ${message.id} canceled.`);
}

function getScheduledMessages() {
  return messagesReference;
}

module.exports = {
  startScheduler,
  stopScheduler,
  scheduleMessage,
  cancelMessage,
  getScheduledMessages,
};
