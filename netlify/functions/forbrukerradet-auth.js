const AUTH_URL = "https://finans-api.forbrukerradet.no/auth/token";

let cachedToken = null;
let tokenExpiresAt = null;

async function fetchNewToken() {
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

  if (!data.access_token) {
    throw new Error("No access_token in response");
  }

  return {
    token: data.access_token,
    expiresIn: data.expires_in || 3600,
  };
}

function isTokenExpired() {
  if (!cachedToken || !tokenExpiresAt) return true;
  return Date.now() >= tokenExpiresAt - 60_000;
}

export async function getValidToken() {
  if (isTokenExpired()) {
    const { token, expiresIn } = await fetchNewToken();
    cachedToken = token;
    tokenExpiresAt = Date.now() + expiresIn * 1000;
  }
  return cachedToken;
}

export const handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const token = await getValidToken();
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: true, tokenPreview: token.slice(0, 20) + "..." }),
    };
  } catch (error) {
    console.error("Token fetch error:", error.message);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, error: error.message }),
    };
  }
};
