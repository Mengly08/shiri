addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const TELEGRAM_BOT_TOKEN = '7785475610:AAHLb5faSE_ycTHvKlqOBtmzZm1545aBjBE'
const TELEGRAM_CHAT_ID = '-1002342563721'
const KHQR_API_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI3MjM5Mzc5NTA3IiwiaWF0IjoxNzQwMjQxMDM1LCJleHAiOjEyNDA3NTMwNjM1fQ.nNhzPkY1MvgmE9tXsbfNPITyqNjcgnSsmv_7r4OeWKk'
const BAKONG_API_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjp7ImlkIjoiYzlmZmRiYjQ0YzM0NDNkNiJ9LCJpYXQiOjE3NDAzNjkwOTUsImV4cCI6MTc0ODE0NTA5NX0.bUbqyg_V2QBPGoeH2bMJcOHpLu8JuZaZKf5AYok73RE'

async function handleRequest(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    })
  }

  const url = new URL(request.url)

  // Handle Telegram messages
  if (url.pathname === '/api/telegram') {
    const data = await request.json()
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: data.message
      })
    })
    
    return new Response(JSON.stringify(await response.json()), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    })
  }

  // Handle KHQR generation
  if (url.pathname === '/api/khqr') {
    const data = await request.json()
    const response = await fetch('https://khqr.sanawin.icu/khqr/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${KHQR_API_TOKEN}`
      },
      body: JSON.stringify(data)
    })
    
    return new Response(JSON.stringify(await response.json()), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    })
  }

  // Handle Bakong transaction verification
  if (url.pathname === '/api/verify-payment') {
    const data = await request.json()
    const response = await fetch('https://api-bakong.nbc.gov.kh/v1/check_transaction_by_md5', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BAKONG_API_TOKEN}`
      },
      body: JSON.stringify({ md5: data.md5 })
    })
    
    return new Response(JSON.stringify(await response.json()), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    })
  }

  return new Response('Not found', { status: 404 })
}