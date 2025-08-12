import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge',
};

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TELEGRAM_ORDERS_CHAT_ID = '-1002512828306';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Message deduplication window in milliseconds (5 minutes)
const DEDUP_WINDOW = 300000;

// Rate limiting configuration
const RATE_LIMIT = {
  windowMs: 60000, // 1 minute
  maxRequests: 30, // Maximum requests per minute
};

// Message queue for handling high volume
interface QueuedMessage {
  chatId: string;
  text: string;
  timestamp: number;
  retryCount: number;
  priority: number; // Higher number = higher priority
}

const messageQueue: QueuedMessage[] = [];
let isProcessingQueue = false;

// Keep track of recent messages with more detailed info
const recentMessages = new Map<string, {
  timestamp: number;
  mainGroupSent: boolean;
  ordersGroupSent: boolean;
  content: string;
  retryCount: number;
  lastError?: string;
}>();

// Rate limiting tracker
const rateLimitTracker = new Map<string, {
  count: number;
  resetTime: number;
}>();

// Maximum retry attempts for failed messages
const MAX_RETRIES = 3;

// Clean up old messages and rate limit data periodically
setInterval(() => {
  const now = Date.now();
  
  // Clean up old messages
  for (const [key, data] of recentMessages.entries()) {
    if (now - data.timestamp > DEDUP_WINDOW) {
      recentMessages.delete(key);
    }
  }
  
  // Clean up rate limit data
  for (const [key, data] of rateLimitTracker.entries()) {
    if (now > data.resetTime) {
      rateLimitTracker.delete(key);
    }
  }
  
  // Clean up old queued messages
  while (messageQueue.length > 0 && now - messageQueue[0].timestamp > DEDUP_WINDOW) {
    messageQueue.shift();
  }
}, 60000);

// Helper function to create a unique message key
function createMessageKey(message: string, chatId: string): string {
  return `${message}-${chatId}-${Date.now()}`;
}

// Helper function to check rate limit
function checkRateLimit(chatId: string): boolean {
  const now = Date.now();
  const limitData = rateLimitTracker.get(chatId) || {
    count: 0,
    resetTime: now + RATE_LIMIT.windowMs
  };

  if (now > limitData.resetTime) {
    limitData.count = 1;
    limitData.resetTime = now + RATE_LIMIT.windowMs;
  } else if (limitData.count >= RATE_LIMIT.maxRequests) {
    return false;
  } else {
    limitData.count++;
  }

  rateLimitTracker.set(chatId, limitData);
  return true;
}

// Helper function to send message to Telegram with retries
async function sendTelegramMessage(chatId: string, text: string, retryCount = 0): Promise<boolean> {
  try {
    if (!checkRateLimit(chatId)) {
      // If rate limited, queue the message with high priority
      messageQueue.push({
        chatId,
        text,
        timestamp: Date.now(),
        retryCount,
        priority: 2
      });
      return false;
    }

    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'HTML',
          disable_notification: false,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.description || 'Failed to send message');
    }

    return true;
  } catch (error) {
    console.error(`Telegram API error (attempt ${retryCount + 1}):`, error);
    
    if (retryCount < MAX_RETRIES) {
      // Queue the retry with increased priority
      messageQueue.push({
        chatId,
        text,
        timestamp: Date.now(),
        retryCount: retryCount + 1,
        priority: 3
      });
      return false;
    }
    
    return false;
  }
}

// Process message queue
async function processMessageQueue() {
  if (isProcessingQueue || messageQueue.length === 0) return;

  isProcessingQueue = true;

  try {
    // Sort queue by priority (higher first) and then by timestamp
    messageQueue.sort((a, b) => 
      b.priority - a.priority || a.timestamp - b.timestamp
    );

    while (messageQueue.length > 0) {
      const message = messageQueue[0];
      
      if (!checkRateLimit(message.chatId)) {
        // Wait for rate limit window to reset
        await new Promise(resolve => 
          setTimeout(resolve, RATE_LIMIT.windowMs)
        );
        continue;
      }

      const success = await sendTelegramMessage(
        message.chatId,
        message.text,
        message.retryCount
      );

      if (success) {
        messageQueue.shift(); // Remove processed message
      } else {
        // If failed and max retries reached, remove from queue
        if (message.retryCount >= MAX_RETRIES) {
          messageQueue.shift();
        }
        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  } finally {
    isProcessingQueue = false;
  }
}

// Start queue processing periodically
setInterval(processMessageQueue, 1000);

export default async function handler(
  request: Request,
  response: Response
) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Check for authorization header
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Validate the payment token
    const { data: validationResult, error: validationError } = await supabase
      .rpc('validate_payment_token', { token_to_check: token });

    if (validationError || !validationResult) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const orderData = validationResult.order_data;
    
    // Send messages directly without queueing for immediate delivery
    let mainSuccess = false;
    let ordersSuccess = false;

    try {
      // Send to main group
      const mainResponse = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: orderData.mainMessage,
            parse_mode: 'HTML',
            disable_notification: false,
          }),
        }
      );

      const mainData = await mainResponse.json();
      mainSuccess = mainData.ok;

      // Send to orders group
      const ordersResponse = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: TELEGRAM_ORDERS_CHAT_ID,
            text: orderData.orderMessage,
            parse_mode: 'HTML',
            disable_notification: false,
          }),
        }
      );

      const ordersData = await ordersResponse.json();
      ordersSuccess = ordersData.ok;

      // If either message failed, queue them for retry
      if (!mainSuccess) {
        messageQueue.push({
          chatId: TELEGRAM_CHAT_ID!,
          text: orderData.mainMessage,
          timestamp: Date.now(),
          retryCount: 0,
          priority: 2
        });
      }

      if (!ordersSuccess) {
        messageQueue.push({
          chatId: TELEGRAM_ORDERS_CHAT_ID,
          text: orderData.orderMessage,
          timestamp: Date.now(),
          retryCount: 0,
          priority: 2
        });
      }

      // Start processing queue if any messages failed
      if (!mainSuccess || !ordersSuccess) {
        processMessageQueue().catch(console.error);
      }

    } catch (error) {
      console.error('Error sending Telegram messages:', error);
      
      // Queue both messages for retry
      messageQueue.push({
        chatId: TELEGRAM_CHAT_ID!,
        text: orderData.mainMessage,
        timestamp: Date.now(),
        retryCount: 0,
        priority: 2
      });

      messageQueue.push({
        chatId: TELEGRAM_ORDERS_CHAT_ID,
        text: orderData.orderMessage,
        timestamp: Date.now(),
        retryCount: 0,
        priority: 2
      });

      processMessageQueue().catch(console.error);
    }

    // Success response
    return new Response(JSON.stringify({ 
      success: true,
      mainGroupSent: mainSuccess,
      ordersGroupSent: ordersSuccess,
      queued: !mainSuccess || !ordersSuccess
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(JSON.stringify({ error: 'Failed to process request' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
