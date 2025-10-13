/**
 * Seamless Wallet / Evolution One-Wallet Integration
 * Drop-in Express router
 */

import express from "express";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

/* ------------------------ EVO CONFIGURATION ------------------------ */
/**
 * Replace these placeholders with the credentials from your EVO account manager.
 * All calls MUST be over HTTPS, and your public IP must be whitelisted by EVO.
 */
const EVO_HOSTNAME = "your-evo-hostname.com";     // e.g. int.evoapi.com
const CASINO_KEY   = "your_casino_key";
const API_TOKEN    = "your_api_token";
const AUTH_TOKEN   = "s3cr3tV4lu3";               // One-Wallet authToken
const AUTH_URL     = `https://${EVO_HOSTNAME}/ua/v1/${CASINO_KEY}/${API_TOKEN}`;

/* ------------------------ TEMPORARY DATA STORE ------------------------ */
/** Replace with your DB (Firebase / Mongo / SQL). */
const players = {
  "player123": { balance: 100.0, sessionId: "session123" },
};

/* ------------------------ 1️⃣ AUTHENTICATE PLAYER ------------------------ */
/**
 * Your frontend calls this endpoint to get a playable game URL.
 * You forward player info to EVO’s Authentication API.
 */
router.post("/authenticate-player", async (req, res) => {
  const player = req.body;
  const body = {
    uuid: uuidv4(),
    player: {
      id: player.id,
      update: true,
      firstName: player.firstName,
      lastName: player.lastName,
      nickname: player.nickname || player.firstName,
      country: player.country,
      language: player.language,
      currency: player.currency,
      session: {
        id: player.sessionId,
        ip: player.ip,
      },
    },
    config: {
      game: {
        category: player.category || "roulette",
        interface: "view1",
        table: { id: player.tableId || "vip-roulette-123" },
      },
      channel: { wrapped: false, mobile: true },
    },
  };

  try {
    const evoRes = await axios.post(AUTH_URL, body, {
      headers: { "Content-Type": "application/json" },
      timeout: 5000,
    });
    const entryUrl = `https://${EVO_HOSTNAME}${evoRes.data.entry}`;
    res.json({ status: "OK", entryUrl });
  } catch (err) {
    console.error("Auth error:", err.response?.data || err.message);
    res
      .status(500)
      .json({ status: "ERROR", detail: err.response?.data || err.message });
  }
});

/* ------------------------ 2️⃣ /api/check ------------------------ */
/** EVO → your server : verify that user/session are valid. */
router.post("/api/check", (req, res) => {
  const { userId, sid } = req.body;
  const player = players[userId];
  if (player && player.sessionId === sid)
    return res.json({ status: "OK", sid, uuid: uuidv4() });

  res.status(400).json({ status: "INVALID_SID", uuid: uuidv4() });
});

/* ------------------------ 3️⃣ /api/balance ------------------------ */
router.post("/api/balance", (req, res) => {
  const { userId } = req.body;
  const player = players[userId];
  if (!player)
    return res.status(404).json({ status: "INVALID_USER", uuid: uuidv4() });
  res.json({ status: "OK", balance: player.balance, uuid: uuidv4() });
});

/* ------------------------ 4️⃣ /api/debit ------------------------ */
/** Deduct bet amount. */
router.post("/api/debit", (req, res) => {
  const { userId, transaction } = req.body;
  const player = players[userId];
  if (!player)
    return res.status(404).json({ status: "INVALID_USER", uuid: uuidv4() });

  if (player.balance < transaction.amount)
    return res.json({
      status: "INSUFFICIENT_FUNDS",
      balance: player.balance,
      uuid: uuidv4(),
    });

  player.balance -= transaction.amount;
  res.json({ status: "OK", balance: player.balance, uuid: uuidv4() });
});

/* ------------------------ 5️⃣ /api/credit ------------------------ */
/** Add winnings. */
router.post("/api/credit", (req, res) => {
  const { userId, transaction } = req.body;
  const player = players[userId];
  if (!player)
    return res.status(404).json({ status: "INVALID_USER", uuid: uuidv4() });

  player.balance += transaction.amount;
  res.json({ status: "OK", balance: player.balance, uuid: uuidv4() });
});

/* ------------------------ 6️⃣ /api/cancel ------------------------ */
/** Refund cancelled bet. */
router.post("/api/cancel", (req, res) => {
  const { userId, transaction } = req.body;
  const player = players[userId];
  if (!player)
    return res.status(404).json({ status: "INVALID_USER", uuid: uuidv4() });

  player.balance += transaction.amount;
  res.json({ status: "OK", balance: player.balance, uuid: uuidv4() });
});

export default router;
