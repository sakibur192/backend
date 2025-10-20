const express = require("express");
const axios = require("axios");
const router = express.Router();

// === EVO Config ===
const EVO_HOST = "https://site-stag-api.nimstad99.com"; // Replace with your Game List API Hostname
const CASINO_KEY = "k3ztnqu12vbxosxm";              // Replace with your casino key
const API_TOKEN = "d09ccec81641149074f92108b7e90078";           // Replace with your token

// === Encode Basic Auth ===
const authHeader = "Basic " + Buffer.from(`${CASINO_KEY}:${API_TOKEN}`).toString("base64");

// === GET /api/games ===
router.get("/games", async (req, res) => {
  try {
    const url = `${EVO_HOST}/api/lobby/v1/${CASINO_KEY}/tablelist`;

    const response = await axios.get(url, {
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json"
      },
      timeout: 15000
    });

    // Clean and format the data
    const tables = response.data?.[0]?.data?.map((table) => ({
      tableName: table["Table Name"],
      tableId: table["Table ID"],
      directLaunchId: table["Direct Launch Table ID"],
      gameType: table["Game Type"],
      betLimit: table["Bet Limit"]
    })) || [];

    return res.status(200).json({
      status: 0,
      message: "EVO game list fetched successfully",
      count: tables.length,
      data: tables
    });

  } catch (error) {
    console.error("EVO Game List Error:", error.message);

    return res.status(500).json({
      status: 1,
      message: "Failed to fetch EVO game list",
      error: error.message
    });
  }
});

module.exports = router;
