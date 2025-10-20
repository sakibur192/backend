const express = require("express");
const axios = require("axios");
const router = express.Router();

// === EVO Config ===
const EVO_HOST = "https://site-stag-api.nimstad99.com"; // EVO staging hostname
const CASINO_KEY = "k3ztnqu12vbxosxm";                  // Your casino key
const API_TOKEN = "d09ccec81641149074f92108b7e90078";   // Your API token

// === Encode Basic Auth ===
const authHeader = "Basic " + Buffer.from(`${CASINO_KEY}:${API_TOKEN}`).toString("base64");

// === GET /api/games ===
router.get("/games", async (req, res) => {
  try {
    const url = `${EVO_HOST}/api/lobby/v1/${CASINO_KEY}/tablelist`;

    const response = await axios.get(url, {
      headers: {
        Authorization: authHeader,
        "Accept": "application/json"
      },
      timeout: 15000
    });

    // Check if data exists
    const rawTables = response.data?.[0]?.data || [];
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

module.exports = router;
