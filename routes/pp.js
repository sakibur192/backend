const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const router = express.Router();

// Replace with your real credentials
const API_URL = "https://api.prerelease-env.biz/IntegrationService/v3/http/CasinoGameAPI/getCasinoGames/";
const SECURE_LOGIN = "tlbt_itelbet";
const OPERATOR_SECRET = "hmednN6zovHK7KuE";
const SHARED_SECRET = OPERATOR_SECRET


router.post("/getCasinoGames", async (req, res) => {
  try {
    // 1️⃣ Create hash
    const hash = crypto
      .createHash("md5")
      .update(SECURE_LOGIN + OPERATOR_SECRET)
      .digest("hex");

    // 2️⃣ Prepare body
    const params = new URLSearchParams({
      secureLogin: SECURE_LOGIN,
      hash: hash,
      options: "GetFeatures,GetFrbDetails,GetLines,GetDataTypes,GetFcDetails,GetStudio"
    });

    // 3️⃣ Send POST request
    const response = await axios.post(API_URL, params.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });

    // 4️⃣ Handle response
    if (response.data.error === "0") {
      console.log("✅ Games retrieved successfully.");
      res.json(response.data.gameList);
    } else {
      console.error("❌ Error:", response.data.description);
      res.status(400).json({ error: response.data });
    }
  } catch (error) {
    console.error("⚠️ Request failed:", error.message);
    res.status(500).json({ error: error.message });
  }
});

function generateHash(params = {}) {
    const sortedKeys = Object.keys(params).sort();
    const hashString = sortedKeys.map(key => params[key]).join('') + SHARED_SECRET;
    return crypto.createHash('md5').update(hashString).digest('hex');
}

/**
 * AUTHENTICATE
 */
router.post('/authenticate', (req, res) => {
    const { token, providerId, gameId, ipAddress } = req.body;

    // TODO: Replace with real logic
    const response = {
        userId: "12345",
        currency: "USD",
        cash: 1000.00,
        bonus: 50.00,
        token: token,
        betLimits: { defaultBet: 0.1, minBet: 0.02, maxBet: 10.0, minTotalBet: 0.5, maxTotalBet: 250.0 },
        extraInfo: { promoAvailable: "Y" },
        error: 0,
        description: "Success"
    };

    res.json(response);
});

/**
 * BALANCE
 */
router.post('/balance', (req, res) => {
    const { userId } = req.body;
    const response = { userId, cash: 1000.00, bonus: 50.00, error: 0, description: "Success" };
    res.json(response);
});

/**
 * BET
 */
router.post('/bet', (req, res) => {
    const { userId, roundId, betAmount, gameId } = req.body;
    const response = { userId, roundId, cash: 990.00, bonus: 50.00, error: 0, description: "Bet accepted" };
    res.json(response);
});

/**
 * RESULT
 */
router.post('/result', (req, res) => {
    const { userId, roundId, winAmount } = req.body;
    const response = { userId, roundId, cash: 1100.00, bonus: 50.00, error: 0, description: "Result accepted" };
    res.json(response);
});

/**
 * REFUND
 */
router.post('/refund', (req, res) => {
    const { userId, roundId, refundAmount } = req.body;
    const response = { userId, roundId, cash: 1000.00, bonus: 50.00, error: 0, description: "Refund processed" };
    res.json(response);
});

/**
 * BONUS WIN
 */
router.post('/bonuswin', (req, res) => {
    const { userId, roundId, bonusAmount } = req.body;
    const response = { userId, roundId, cash: 1000.00, bonus: 60.00, error: 0, description: "Bonus added" };
    res.json(response);
});

/**
 * JACKPOT WIN
 */
router.post('/jackpotwin', (req, res) => {
    const { userId, jackpotAmount } = req.body;
    const response = { userId, cash: 5000.00, bonus: 50.00, error: 0, description: "Jackpot win added" };
    res.json(response);
});

/**
 * PROMO WIN
 */
router.post('/promowin', (req, res) => {
    const { userId, promoAmount } = req.body;
    const response = { userId, cash: 1050.00, bonus: 50.00, error: 0, description: "Promo win added" };
    res.json(response);
});

/**
 * END ROUND
 */
router.post('/endround', (req, res) => {
    const { userId, roundId } = req.body;
    const response = { userId, roundId, error: 0, description: "Round ended successfully" };
    res.json(response);
});

/**
 * ADJUSTMENT
 */
router.post('/adjustment', (req, res) => {
    const { userId, adjustAmount, reason } = req.body;
    const response = { userId, cash: 1200.00, bonus: 50.00, error: 0, description: "Adjustment applied" };
    res.json(response);
});

/**
 * GET ALL GAMES
 */
router.post('/getAllGames', (req, res) => {
    const gameList = [
        { gameId: 1, name: "Slot A", type: "SLOT" },
        { gameId: 2, name: "Roulette B", type: "ROULETTE" }
    ];
    res.json({ error: 0, description: "Success", gameList });
});





module.exports = router;