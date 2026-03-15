const AUTH_URL = "https://finans-api.forbrukerradet.no/auth/token";
const BANKS_URL = "https://finans-api.forbrukerradet.no/feed/banks";

async function fetchToken() {
  const clientId = process.env.FORBRUKERRADET_CLIENT_ID;
  const clientSecret = process.env.FORBRUKERRADET_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing API credentials in environment variables");
  }

  const response = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grantType: "external_consumer",
      clientId,
      clientSecret,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Auth failed (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const token = data.token || data.access_token || data.accessToken;

  if (!token) {
    throw new Error(`No token found. Response was: ${JSON.stringify(data)}`);
  }

  return token;
}

async function fetchBanks(token) {
  const response = await fetch(BANKS_URL, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Banks fetch failed (${response.status}): ${errorBody}`);
  }

  return await response.json();
}

export const handler = async (event) => {
  // Allow requests from your frontend only
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET",
  };

  if (event.httpMethod !== "GET") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  try {
    const token = await fetchToken();
    const banks = await fetchBanks(token);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, banks }),
    };
  } catch (error) {
    console.error("Error:", error.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message }),
    };
  }
};
```

> 💡 **Merk:** Koden prøver automatisk flere mulige tokenfelt (`token`, `access_token`, `accessToken`) siden vi ikke vet eksakt hva Forbrukerrådet kaller feltet i prod-miljøet.

---

## Del 3 — Mappestruktur

Slik skal repoet ditt se ut:
```
byttehjelpernn/
├── netlify/
│   └── functions/
│       └── forbrukerradet-auth.js   ← denne filen
├── netlify.toml
└── minside.html
```

Environment variables er allerede lagt inn fra tidligere — `FORBRUKERRADET_CLIENT_ID` og `FORBRUKERRADET_CLIENT_SECRET` ligger trygt i Netlify. ✅

---

## Neste steg

1. Commit den nye koden til GitHub
2. Vent 1-2 min på deploy
3. Test denne URL-en i nettleseren:
```
https://grand-mooncake-0a9c5b.netlify.app/.netlify/functions/forbrukerradet-auth
