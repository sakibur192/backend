const express = require("express");
const axios = require("axios");
const router = express.Router();

// === EVO Config ===
const EVO_HOST = "https://site-stag-api.nimstad99.com"; // EVO staging hostname
const CASINO_KEY = "k3ztnqu12vbxosxm";                  // Your casino key
const API_TOKEN = "d09ccec81641149074f92108b7e90078";   // Your API token

// === Encode Basic Auth ===
const authHeader = "Basic " + Buffer.from(`${CASINO_KEY}:${API_TOKEN}`).toString("base64");

// === DEMO USER CONFIG ===
const DEMO_USER = {
  username: "demo_user",
  authToken: "s3cr3tV4lu3",
  currency: "USD",
  balance: 5000
};

// === BASE URL for Your Service ===
const SERVICE_BASE_URL = "https://my.service.host.com/api";

// === EVO: GET /api/games ===
router.get("/games", async (req, res) => {
  try {
    const url = `${EVO_HOST}/api/lobby/v1/${CASINO_KEY}/tablelist`;

    const response = await axios.get(url, {
      headers: {
        Authorization: authHeader,
        Accept: "application/json"
      },
      timeout: 15000
    });

    const rawTables = response.data?.data || [];
    const tables = rawTables.map((table) => ({
      tableName: table["Table Name"],
      tableId: table["Table ID"],
      directLaunchId: table["Direct Launch Table ID"],
      gameType: table["Game Type"],
      betLimit: table["Bet Limit"]
    }));

    return res.status(200).json({
      status: 0,
      message: "EVO game list fetched successfully",
      count: tables.length,
      data: tables
    });

  } catch (error) {
    console.error("EVO Game List Error:", error.response?.data || error.message);

    return res.status(500).json({
      status: 1,
      message: "Failed to fetch EVO game list",
      error: error.response?.data || error.message
    });
  }
});

// === CHECK USER ===
router.get("/check", async (req, res) => {
  try {
    const url = `${SERVICE_BASE_URL}/check?authToken=${DEMO_USER.authToken}`;
    const response = await axios.get(url);
    return res.status(200).json(response.data);
  } catch (error) {
    console.error("CheckUser Error:", error.response?.data || error.message);
    return res.status(500).json({ message: "Failed to check user", error: error.response?.data || error.message });
  }
});

// === BALANCE ===
router.get("/balance", async (req, res) => {
  try {
    const url = `${SERVICE_BASE_URL}/balance?authToken=${DEMO_USER.authToken}`;
    const response = await axios.get(url);
    return res.status(200).json(response.data);
  } catch (error) {
    console.error("Balance Error:", error.response?.data || error.message);
    return res.status(500).json({ message: "Failed to fetch balance", error: error.response?.data || error.message });
  }
});

// === DEBIT ===
router.post("/debit", async (req, res) => {
  try {
    const url = `${SERVICE_BASE_URL}/debit?authToken=${DEMO_USER.authToken}`;
    const response = await axios.post(url, req.body);
    return res.status(200).json(response.data);
  } catch (error) {
    console.error("Debit Error:", error.response?.data || error.message);
    return res.status(500).json({ message: "Failed to debit amount", error: error.response?.data || error.message });
  }
});

// === CREDIT ===
router.post("/credit", async (req, res) => {
  try {
    const url = `${SERVICE_BASE_URL}/credit?authToken=${DEMO_USER.authToken}`;
    const response = await axios.post(url, req.body);
    return res.status(200).json(response.data);
  } catch (error) {
    console.error("Credit Error:", error.response?.data || error.message);
    return res.status(500).json({ message: "Failed to credit amount", error: error.response?.data || error.message });
  }
});

// === CANCEL ===
router.post("/cancel", async (req, res) => {
  try {
    const url = `${SERVICE_BASE_URL}/cancel?authToken=${DEMO_USER.authToken}`;
    const response = await axios.post(url, req.body);
    return res.status(200).json(response.data);
  } catch (error) {
    console.error("Cancel Error:", error.response?.data || error.message);
    return res.status(500).json({ message: "Failed to cancel transaction", error: error.response?.data || error.message });
  }
});

module.exports = router;
