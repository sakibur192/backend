const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");

const router = express.Router();

/* -------------------------------------------------------------------
   CONFIGURATION
------------------------------------------------------------------- */
const EVO_HOST = "https://site-stag-api.nimstad99.com"; // EVO hostname
const CASINO_KEY = "k3ztnqu12vbxosxm";                  // EVO casino key
const API_TOKEN = "d09ccec81641149074f92108b7e90078";   // EVO API token
const AUTH_TOKEN = "s3cr3tV4lu3";                       // Wallet auth token (shared secret)

// Demo user store — replace with DB logic in production
const DEMO_USER = {
  id: "demo_user",
  firstName: "John",
  lastName: "Doe",
  country: "DE",
  language: "en",
  currency: "USD",
  nickname: "demoJohn",
  sessionId: "sess-demo-001",
  balance: 5000.00
};

// Keep processed transactions (in-memory demo)
const processedTransactions = new Map();

/* -------------------------------------------------------------------
   1️⃣ EVO OUTGOING ENDPOINTS
------------------------------------------------------------------- */

/**
 * GET /evo/games
 * Fetch EVO table list (lobby)
 */
router.get("/games", async (req, res) => {
  try {
    const authHeader = "Basic " + Buffer.from(`${CASINO_KEY}:${API_TOKEN}`).toString("base64");
    const url = `${EVO_HOST}/api/lobby/v1/${CASINO_KEY}/tablelist`;
    const response = await axios.get(url, {
      headers: { Authorization: authHeader, Accept: "application/json" },
      timeout: 15000
    });
    const data = response.data?.data || [];
    res.json({
      status: 0,
      message: "Game list fetched successfully",
      count: data.length,
      data
    });
  } catch (error) {
    console.error("EVO /games error:", error.message);
    res.status(500).json({ status: 1, message: "Failed to fetch game list", error: error.message });
  }
});

/**
 * POST /evo/userauth
 * Call EVO User Authentication 2.0 endpoint
 */
router.post("/userauth", async (req, res) => {
  try {
    const tableId =
      req.body?.config?.game?.table?.id ||
      req.body?.tableId ||
      null;

    if (!tableId) {
      return res.status(400).json({ error: "Missing table.id from client" });
    }

    const payload = {
      uuid: uuidv4(),
      player: {
        id: DEMO_USER.id,
        update: true,
        firstName: DEMO_USER.firstName,
        lastName: DEMO_USER.lastName,
        country: DEMO_USER.country,
        nickname: DEMO_USER.nickname,
        language: DEMO_USER.language,
        currency: DEMO_USER.currency,
        session: {
          id: DEMO_USER.sessionId,
          ip: req.headers["x-forwarded-for"] || req.ip || "127.0.0.1"
        }
      },
      config: {
        game: {
          category: "roulette",
          interface: "view1",
          table: { id: tableId }
        },
        channel: { wrapped: false, mobile: false }
      }
    };

    const url = `https://staging-api.asia-live.com/ua/v1/${CASINO_KEY}/${API_TOKEN}`;
    const authHeader =
      "Basic " + Buffer.from(`${CASINO_KEY}:${API_TOKEN}`).toString("base64");

    const response = await axios.post(url, payload, {
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json"
      }
    });

    return res.json(response.data);

  } catch (error) {
    console.error("❌ EVO /userauth error:", error.response?.data || error.message);
    return res.status(500).json({
      error: error.message,
      evo: error.response?.data
    });
  }
});

/* -------------------------------------------------------------------
   2️⃣ ONE WALLET ENDPOINTS (EVO → YOU)
   EVO will call these via HTTPS POST + ?authToken=...
------------------------------------------------------------------- */

/** Helper: validate the query authToken */
function isValidToken(req) {
  const token = decodeURIComponent(req.query.authToken || "");
  return token === AUTH_TOKEN;
}

/** Helper: format JSON response per EVO spec */
function sendResponse(res, status, balance, uuid, message) {
  const body = { status };
  if (balance !== undefined) body.balance = Number(balance.toFixed(2));
  if (uuid) body.uuid = uuid;
  if (message) body.message = message;
  res.status(200).json(body);
}

/**
 * POST /api/check?authToken=...
 */
router.post("/check", (req, res) => {
  if (!isValidToken(req)) return sendResponse(res, "INVALID_TOKEN_ID", DEMO_USER.balance, uuidv4(), "Invalid auth token");
  const uuid = req.body.uuid || uuidv4();
  return res.json({ status: "OK", sid: DEMO_USER.sessionId, uuid });
});

/**
 * POST /api/balance?authToken=...
 */
router.post("/balance", (req, res) => {
  if (!isValidToken(req)) return sendResponse(res, "INVALID_TOKEN_ID", DEMO_USER.balance, uuidv4());
  const uuid = req.body.uuid || uuidv4();
  sendResponse(res, "OK", DEMO_USER.balance, uuid);
});

/**
 * POST /api/debit?authToken=...
 */
router.post("/debit", (req, res) => {
  if (!isValidToken(req)) return sendResponse(res, "INVALID_TOKEN_ID", DEMO_USER.balance, uuidv4());
  const { transaction } = req.body || {};
  const uuid = req.body.uuid || uuidv4();

  if (!transaction || !transaction.id) return sendResponse(res, "INVALID_PARAMETER", DEMO_USER.balance, uuid, "Missing transaction.id");
  if (processedTransactions.has(transaction.id))
    return sendResponse(res, "BET_ALREADY_EXIST", DEMO_USER.balance, uuid);

  const amount = parseFloat(transaction.amount || 0);
  if (DEMO_USER.balance < amount)
    return sendResponse(res, "INSUFFICIENT_FUNDS", DEMO_USER.balance, uuid);

  DEMO_USER.balance -= amount;
  processedTransactions.set(transaction.id, { type: "DEBIT", amount, status: "OK" });
  sendResponse(res, "OK", DEMO_USER.balance, uuid);
});

/**
 * POST /api/credit?authToken=...
 */
router.post("/credit", (req, res) => {
  if (!isValidToken(req)) return sendResponse(res, "INVALID_TOKEN_ID", DEMO_USER.balance, uuidv4());
  const { transaction } = req.body || {};
  const uuid = req.body.uuid || uuidv4();

  if (!transaction || !transaction.id) return sendResponse(res, "INVALID_PARAMETER", DEMO_USER.balance, uuid, "Missing transaction.id");
  if (processedTransactions.has(transaction.id))
    return sendResponse(res, "BET_ALREADY_SETTLED", DEMO_USER.balance, uuid);

  const amount = parseFloat(transaction.amount || 0);
  DEMO_USER.balance += amount;
  processedTransactions.set(transaction.id, { type: "CREDIT", amount, status: "OK" });
  sendResponse(res, "OK", DEMO_USER.balance, uuid);
});

/**
 * POST /api/cancel?authToken=...
 */
router.post("/cancel", (req, res) => {
  if (!isValidToken(req)) return sendResponse(res, "INVALID_TOKEN_ID", DEMO_USER.balance, uuidv4());
  const { transaction } = req.body || {};
  const uuid = req.body.uuid || uuidv4();

  if (!transaction || !transaction.id) return sendResponse(res, "INVALID_PARAMETER", DEMO_USER.balance, uuid, "Missing transaction.id");
  const existing = processedTransactions.get(transaction.id);
  if (!existing) return sendResponse(res, "BET_DOES_NOT_EXIST", DEMO_USER.balance, uuid);

  if (existing.type === "DEBIT" && existing.status === "OK") {
    DEMO_USER.balance += existing.amount;
    processedTransactions.set(transaction.id, { ...existing, type: "CANCEL", status: "OK" });
  }

  sendResponse(res, "OK", DEMO_USER.balance, uuid);
});

/* -------------------------------------------------------------------
   3️⃣ Health Check
------------------------------------------------------------------- */
router.get("/health", (req, res) => {
  res.json({
    status: "UP",
    user: { id: DEMO_USER.id, balance: DEMO_USER.balance.toFixed(2) },
    transactions: processedTransactions.size
  });
});

module.exports = router;
