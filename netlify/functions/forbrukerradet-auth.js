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

exports.handler = async function(event) {
  const headers = {
    "Content-Type": "application/json",
};
