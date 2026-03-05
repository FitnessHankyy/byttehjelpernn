// Netlify Function — Finansportalen API Proxy
// Kjører server-side, ingen CORS-problemer

const FP_BASE = 'https://finans-api.forbrukerradet.no';
const CLIENT_ID     = '7c69a8a87ea16f0ee8b8eadc0c9199c13deedf939166ee9937a43f16e2f86cd9b654e651938399e1c171a7d2d168305a40c5bd60309eb99a996ecdb55b86b7a8';
const CLIENT_SECRET = 'f4b9cb56bfb46576ea54cb63c305263c9e057bb236f226e4115011113090b315c7d4391c917beeaed8b98ea29c4406ff607d596fb6940b30e38a8c6d1ec2bea0';

// Enkel in-memory token-cache (lever så lenge funksjonen er varm)
let cachedToken = null;
let tokenExpiry  = 0;

async function getToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const resp = await fetch(`${FP_BASE}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grantType:    'external_consumer',
      clientId:     CLIENT_ID,
      clientSecret: CLIENT_SECRET,
    }),
  });

  if (!resp.ok) throw new Error(`Auth feilet: ${resp.status}`);
  const data = await resp.json();
  cachedToken = data.accessToken;
  tokenExpiry  = Date.now() + (data.expiresIn - 120) * 1000; // 2 min buffer
  return cachedToken;
}

exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // Hvilket endepunkt vil klienten ha?
  const endpoint = event.queryStringParameters?.endpoint || 'bank-deposits';
  const ALLOWED = {
    'bank-deposits': '/feed/bank-deposits/all',
    'mortgages':     '/feed/mortgages/all',
    'banks':         '/feed/banks',
  };

  if (!ALLOWED[endpoint]) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Ukjent endepunkt: ' + endpoint }),
    };
  }

  try {
    const token = await getToken();
    const resp  = await fetch(FP_BASE + ALLOWED[endpoint], {
      headers: { 'Authorization': 'Bearer ' + token },
    });

    if (!resp.ok) {
      const txt = await resp.text();
      return {
        statusCode: resp.status,
        headers,
        body: JSON.stringify({ error: 'API feil', status: resp.status, detalj: txt }),
      };
    }

    const data = await resp.json();
    return { statusCode: 200, headers, body: JSON.stringify(data) };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
