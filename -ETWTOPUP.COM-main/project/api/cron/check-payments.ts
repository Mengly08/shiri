import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge',
};

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TELEGRAM_ORDERS_CHAT_ID = '-1002399561845';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Message queue configuration
const messageQueue: {
  chatId: string;
  text: string;
  timestamp: number;
  retryCount: number;
}[] = [];

let isProcessingQueue = false;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const PAYMENT_WINDOW = 30 * 60 * 1000; // 30 minutes payment window

async function verifyPayment(md5: string): Promise<boolean> {
  try {
    const response = await fetch(
      'https://api-bakong.nbc.gov.kh/v1/check_transaction_by_md5',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.BAKONG_API_TOKEN}`,
        },
        body: JSON.stringify({ md5 }),
      }
    );

    if (!response.ok) {
      console.error('Bakong API error:', response.status);
      return false;
    }

    const data = await response.json();
    return data.responseCode === 0;
  } catch (error) {
    console.error('Error verifying payment:', error);
    return false;
  }
}

async function sendTelegramMessage(chatId: string, text: string, retryCount = 0): Promise<boolean> {
  try {
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
    return data.ok;
  } catch (error) {
    console.error(`Telegram API error (attempt ${retryCount + 1}):`, error);
    
    if (retryCount < MAX_RETRIES) {
      messageQueue.push({
        chatId,
        text,
        timestamp: Date.now(),
        retryCount: retryCount + 1
      });
      return false;
    }
    
    return false;
  }
}

async function processMessageQueue() {
  if (isProcessingQueue || messageQueue.length === 0) return;

  isProcessingQueue = true;

  try {
    while (messageQueue.length > 0) {
      const message = messageQueue[0];
      
      const success = await sendTelegramMessage(
        message.chatId,
        message.text,
        message.retryCount
      );

      if (success) {
        messageQueue.shift();
      } else {
        if (message.retryCount >= MAX_RETRIES) {
          messageQueue.shift();
        }
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
    }
  } finally {
    isProcessingQueue = false;
  }
}

export default async function handler(
  request: Request,
  response: Response
) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Get all unverified payment tokens within the payment window
    const cutoffTime = new Date(Date.now() - PAYMENT_WINDOW).toISOString();
    
    const { data: tokens, error: fetchError } = await supabase
      .from('payment_tokens')
      .select('*')
      .eq('used', false)
      .gt('created_at', cutoffTime)
      .order('created_at', { ascending: true });

    if (fetchError) throw fetchError;

    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ message: 'No pending payments to check' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const results = [];

    // Check each payment token
    for (const token of tokens) {
      const orderData = token.order_data;
      const md5Hash = orderData.md5;

      if (!md5Hash) continue;

      // Verify the payment
      const isVerified = await verifyPayment(md5Hash);

      if (isVerified) {
        // Double verify to ensure payment
        const secondVerification = await verifyPayment(md5Hash);
        
        if (secondVerification) {
          // Mark token as used
          const { error: updateError } = await supabase
            .from('payment_tokens')
            .update({ used: true })
            .eq('id', token.id);

          if (updateError) {
            console.error('Error updating token:', updateError);
            continue;
          }

          // Send to main group
          const mainSuccess = await sendTelegramMessage(
            TELEGRAM_CHAT_ID!,
            orderData.mainMessage
          );

          // Send to orders group
          const ordersSuccess = await sendTelegramMessage(
            TELEGRAM_ORDERS_CHAT_ID,
            orderData.orderMessage
          );

          results.push({
            tokenId: token.id,
            verified: true,
            mainGroupSent: mainSuccess,
            ordersGroupSent: ordersSuccess
          });
        }
      }
    }

    // Process any queued messages
    await processMessageQueue();

    return new Response(JSON.stringify({
      message: 'Payment check completed',
      results,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in cron job:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
