import { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
  runtime: 'edge',
};

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
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { md5 } = await request.json();
    
    // Add retry mechanism for Bakong API
    let attempts = 0;
    const maxAttempts = 3;
    const retryDelay = 1000; // 1 second

    while (attempts < maxAttempts) {
      try {
        const bakongResponse = await fetch(
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

        const data = await bakongResponse.json();

        // If successful, return immediately
        if (bakongResponse.ok) {
          return new Response(JSON.stringify(data), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // If error is permanent (e.g., 400 Bad Request), don't retry
        if (bakongResponse.status >= 400 && bakongResponse.status < 500) {
          return new Response(JSON.stringify(data), {
            status: bakongResponse.status,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // For other errors, retry after delay
        attempts++;
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      } catch (error) {
        console.error(`Attempt ${attempts + 1} failed:`, error);
        attempts++;
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }

    // If all attempts failed
    return new Response(JSON.stringify({ 
      error: 'Failed to verify payment after multiple attempts',
      responseCode: 1
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Bakong API error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to verify payment',
      responseCode: 1
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
