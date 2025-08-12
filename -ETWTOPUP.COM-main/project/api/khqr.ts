import { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
  runtime: 'edge',
};

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  // Handle CORS preflight request
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

  // Ensure the method is POST
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Parse the payload from the incoming request
    const payload = await request.json();

    // Send a POST request to the KHQR API to generate the QR code
    const khqrResponse = await fetch('https://khqr-nang.bruhstore.online/api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    // Parse the response from the KHQR API
    const data = await khqrResponse.json();

    // Return the data (QR code and other details) in the response
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('KHQR API error:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate QR code' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
