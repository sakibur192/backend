const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const router = express.Router();

const API_URL = "https://api.prerelease-env.biz/IntegrationService/v3/http/CasinoGameAPI/getCasinoGames/";
const SECURE_LOGIN = "tlbt_itelbet";
const OPERATOR_SECRET = "hmednN6zovHK7KuE";

// ✅ Pragmatic Play hash generation as per Section 19.1
function generatePPHash(params) {
  // 1️⃣ Sort all keys alphabetically
  const sortedKeys = Object.keys(params).sort();

  // 2️⃣ Build query string
  const queryString = sortedKeys
    .filter(key => params[key] !== null && params[key] !== "")
    .map(key => `${key}=${params[key]}`)
    .join("&");

  // 3️⃣ Append secret key
  const stringToHash = queryString + OPERATOR_SECRET;

  // 4️⃣ Generate MD5 hash
  return crypto.createHash("md5").update(stringToHash).digest("hex");
}

// 🎮 Fetch Casino Games
router.post("/getCasinoGames", async (req, res) => {
  try {
    const requestParams = {
      secureLogin: SECURE_LOGIN,
      options: "GetFeatures,GetFrbDetails,GetLines,GetDataTypes,GetFcDetails",
    };

    // ✅ Generate hash as per doc rule
    const hash = generatePPHash(requestParams);

    const bodyParams = new URLSearchParams({
      ...requestParams,
      hash: hash,
    });

    const response = await axios.post(API_URL, bodyParams.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const data = response.data;

    if (data.error === "0") {
      console.log(`✅ Retrieved ${data.gameList?.length || 0} games`);
      res.json({
        success: true,
        description: data.description || "Success",
        total: data.gameList?.length || 0,
        games: data.gameList || [],
      });
    } else {
      console.error("❌ API Error:", data.description);
      res.status(400).json({
        success: false,
        error: data.error,
        description: data.description,
      });
    }
  } catch (error) {
    console.error("⚠️ Request failed:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      details: error.message,
    });
  }
});

module.exports = router;
