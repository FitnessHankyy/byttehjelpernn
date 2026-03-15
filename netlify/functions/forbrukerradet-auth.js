const AUTH_URL = "https://finans-api.forbrukerradet.no/auth/token";
const MORTGAGES_URL = "https://finans-api.forbrukerradet.no/feed/mortgages/all";

// --- Token cache ---
var cachedToken = null;
var tokenExpiresAt = null;

// --- Mortgage data cache (5 minutes) ---
var cachedMortgages = null;
var mortgagesCachedAt = null;
var MORTGAGES_CACHE_TTL = 5 * 60 * 1000;

async function fetchToken() {
  var clientId = process.env.FORBRUKERRADET_CLIENT_ID;
  var clientSecret = process.env.FORBRUKERRADET_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing API credentials in environment variables");
  }

  var response = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grantType: "external_consumer",
      clientId: clientId,
      clientSecret: clientSecret,
    }),
  });

  if (!response.ok) {
    var errorBody = await response.text();
    throw new Error("Auth failed (" + response.status + "): " + errorBody);
  }

  var data = await response.json();
  var token = data.token || data.access_token || data.accessToken;

  if (!token) {
    throw new Error("No token found. Response was: " + JSON.stringify(data));
  }

  cachedToken = token;
  tokenExpiresAt = Date.now() + 55 * 60 * 1000;

  return token;
}

async function getValidToken() {
  if (cachedToken && tokenExpiresAt && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }
  return await fetchToken();
}

async function fetchMortgages(token) {
  if (cachedMortgages && mortgagesCachedAt && (Date.now() - mortgagesCachedAt) < MORTGAGES_CACHE_TTL) {
    return cachedMortgages;
  }

  var response = await fetch(MORTGAGES_URL, {
    method: "GET",
    headers: {
      "Authorization": "Bearer " + token,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    var errorBody = await response.text();
    throw new Error("Mortgages fetch failed (" + response.status + "): " + errorBody);
  }

  var data = await response.json();

  cachedMortgages = data;
  mortgagesCachedAt = Date.now();

  return data;
}

exports.handler = async function(event) {
  var headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET",
  };

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: headers,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    var token = await getValidToken();
    var mortgages = await fetchMortgages(token);

    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify({ success: true, mortgages: mortgages }),
    };
  } catch (error) {
    console.error("Error:", error.message);
    return {
      statusCode: 500,
      headers: headers,
      body: JSON.stringify({ success: false, error: error.message }),
    };
  }
};
