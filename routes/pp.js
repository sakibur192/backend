const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const router = express.Router();

const API_URL = "https://api.prerelease-env.biz/IntegrationService/v3/http/CasinoGameAPI/getCasinoGames/";
const SECURE_LOGIN = "tlbt_itelbet";
const OPERATOR_SECRET = "hmednN6zovHK7KuE";
const API_URL2 = "https://api.prerelease-env.biz/IntegrationService/v3/http/CasinoGameAPI/game/url/";
 const SECRET_KEY = OPERATOR_SECRET
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














// Utility: generate MD5 hash according to PP doc
function generateHash(params) {
  // 1. Sort all keys alphabetically
  const sortedKeys = Object.keys(params).sort();

  // 2. Concatenate key=value with &
  const paramString = sortedKeys
    .map(key => `${key}=${params[key]}`)
    .join("&");

  // 3. Append secret key
  const stringToHash = paramString + OPERATOR_SECRET;

  // 4. Generate MD5 hash
  return crypto.createHash("md5").update(stringToHash).digest("hex");
}

// Generate one-time token for player (simple example, you can store in DB for validation)
function generateToken() {
  return crypto.randomBytes(16).toString("hex");
}

/**
 * POST /pp/getGameUrl
 * Body parameters:
 *  - gameId (symbol)
 *  - playerId (externalPlayerId)
 *  - currency (optional)
 *  - platform (optional)
 *  - language (optional, default 'en')
 *  - playMode (optional, 'REAL' or 'DEMO')
 */
router.post("/getGameUrl", async (req, res) => {
  try {
    const {
      gameId,
      playerId,
      currency = "USD",
      platform = "WEB",
      language = "en",
      playMode = "REAL",
      country = "US",   // required
      promo = "n",      // optional promo parameter
      cashierUrl = "",
      lobbyUrl = ""
    } = req.body;

    if (!gameId || !playerId) {
      return res.status(400).json({ error: 14, description: "Required field missing: gameId or playerId" });
    }

    // 1. Generate one-time token
    const token = generateToken();

    // 2. Prepare all parameters for GameURL API
    const requestParams = {
      secureLogin: SECURE_LOGIN,
      symbol: gameId,
      language,
      token,
      externalPlayerId: playerId,
      currency,
      platform,
      technology: "H5",
      stylename: SECURE_LOGIN, // Operator identifier
      cashierUrl,
      lobbyUrl,
      country,
      promo,
      playMode
    };

    // 3. Calculate hash
    const hash = generateHash(requestParams);

    // 4. Prepare POST body including hash
    const bodyParams = new URLSearchParams({ ...requestParams, hash }).toString();

    // 5. Call Pragmatic Play GameURL API
    const response = await axios.post(API_URL2, bodyParams, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 15000
    });

    const data = response.data;

    // 6. Handle errors according to PP spec
    if (data.error && data.error !== "0") {
      return res.status(400).json({ error: data.error, description: data.description });
    }

    // 7. Return gameURL to frontend
    return res.json({
      error: 0,
      description: data.description || "OK",
      gameURL: data.gameURL,
      token // optional: return token for frontend tracking
    });

  } catch (err) {
    console.error("GameURL API request failed:", err.message);
    return res.status(500).json({
      error: 1,
      description: "Internal server error: failed to generate game URL",
      details: err.message
    });
  }
});



const playersDB = {
  "player123": {
    userId: "421",
    currency: "USD",
    cash: 99999.99,
    bonus: 99.99,
    country: "GB",
    jurisdiction: "UK",
    promoEligible: true,
    aamsTicket: "aams123",
    aamsSessionId: "sess456",
    token: "player123-session-token",
    ipAddress: "192.168.1.10"
  }
};

// Helper function to calculate MD5 hash
function calculateHash(params, secret) {
  const keys = Object.keys(params).sort();
  const stringToHash = keys.map(k => `${k}=${params[k] || ""}`).join("&") + secret;
  return crypto.createHash("md5").update(stringToHash).digest("hex");
}

// POST /authenticate.html
router.post("/authenticate", express.urlencoded({ extended: true }), (req, res) => {
  const {
    token,
    providerId,
    gameId,
    hash,
    ipAddress,
    chosenBalance,
    launchingType,
    previousToken
  } = req.body;

 

  // Validate required fields
  if (!token || !providerId || !hash) {
    return res.json({
      error: 7,
      description: "Missing required parameter(s)"
    });
  }

  // Validate hash (include optional fields if present)
  const calculatedHash = calculateHash(
    { token, providerId, gameId, ipAddress, chosenBalance, launchingType, previousToken },
    SECRET_KEY
  );

  if (calculatedHash !== hash) {
    return res.json({
      error: 2,
      description: "Invalid hash or credentials"
    });
  }

  // Lookup player by token
  const player = playersDB[token];
  if (!player) {
    return res.json({
      error: 1,
      description: "Player not found or token invalid"
    });
  }

  // Build response with all optional fields
  const response = {
    userId: player.userId,
    currency: player.currency,
    cash: player.cash,
    bonus: player.bonus,
    token: player.token, // optional session token
    country: player.country,
    jurisdiction: player.jurisdiction,
    betLimits: {
      defaultBet: 0.1,
      defaultTotalBet: 1.0,
      minBet: 0.02,
      maxBet: 10.0,
      minTotalBet: 0.5,
      maxTotalBet: 250.0,
      extMinTotalBet: 0.5,
      extMaxTotalBet: 250.0
    },
    extraInfo: {
      promoAvailable: player.promoEligible ? "Y" : "N",
      jurisdictionMaxBet: 5.0,
      aamsTicket: player.aamsTicket,
      aamsSessionId: player.aamsSessionId
    },
    error: 0,
    description: "Success"
  };

  return res.json(response);
});




// POST /balance.html
router.post("/balance", express.urlencoded({ extended: true }), (req, res) => {
  const { hash, providerId, userId, token } = req.body;

  if (!hash || !providerId || !userId) {
    return res.json({ error: 7, description: "Missing required parameter(s)" });
  }

  // Validate hash (optional token included if provided)
  const calculatedHash = calculateHash({ providerId, userId, token }, SECRET_KEY);
  if (calculatedHash !== hash) {
    return res.json({ error: 2, description: "Invalid hash" });
  }

  const player = Object.values(playersDB).find(p => p.userId === userId);
  if (!player) {
    return res.json({ error: 1, description: "Player not found" });
  }

  res.json({
    currency: player.currency,
    cash: player.cash,
    bonus: player.bonus,
    totalBalance: player.cash + player.bonus, // optional field for Italian market
    error: 0,
    description: "Success"
  });
});




// POST /bet.html
router.post("/bet", express.urlencoded({ extended: true }), (req, res) => {
  const {
    hash,
    providerId,
    userId,
    token,
    gameId,
    roundId,
    amount,
    reference,
    timestamp,
    roundDetails,
    bonusCode,
    platform,
    language,
    jackpotContribution,
    jackpotDetails,
    jackpotId,
    ipAddress
  } = req.body;



  // Required fields validation
  if (!hash || !providerId || !userId || !gameId || !roundId || !amount || !reference || !timestamp) {
    return res.json({ error: 7, description: "Missing required parameter(s)" });
  }

  // Validate hash
  const calculatedHash = calculateHash({
    providerId,
    userId,
    token,
    gameId,
    roundId,
    amount,
    reference,
    timestamp,
    roundDetails,
    bonusCode,
    platform,
    language,
    jackpotContribution,
    jackpotDetails,
    jackpotId,
    ipAddress
  }, SECRET_KEY);

  if (calculatedHash !== hash) {
    return res.json({ error: 2, description: "Invalid hash" });
  }

  // Lookup player
  const player = Object.values(playersDB).find(p => p.userId === userId);
  if (!player) return res.json({ error: 1, description: "Player not found" });

  // Ensure idempotency using reference (for demo, simple in-memory tracking)
  if (!global.betHistory) global.betHistory = {};
  if (global.betHistory[reference]) {
    return res.json(global.betHistory[reference]);
  }

  // Deduct bet from cash (first from cash, then bonus if configured)
  let usedPromo = 0;
  let remainingAmount = parseFloat(amount);
  if (player.cash >= remainingAmount) {
    player.cash -= remainingAmount;
  } else {
    remainingAmount -= player.cash;
    player.cash = 0;
    usedPromo = Math.min(remainingAmount, player.bonus);
    player.bonus -= usedPromo;
  }

  const response = {
    transactionId: Date.now(),
    currency: player.currency,
    cash: player.cash,
    bonus: player.bonus,
    usedPromo,
    error: 0,
    description: "Success"
  };

  // Store transaction to ensure idempotency
  global.betHistory[reference] = response;

  res.json(response);
});


// POST /result.html
router.post("/result", express.urlencoded({ extended: true }), (req, res) => {
  const {
    hash,
    providerId,
    userId,
    token,
    gameId,
    roundId,
    amount,
    reference,
    timestamp,
    roundDetails,
    bonusCode,
    platform,
    promoWinAmount,
    promoWinReference,
    promoCampaignID,
    promoCampaignType,
    specPrizes // can be an array of objects [{specPrizeAmount, specPrizeCode, specPrizeType}]
  } = req.body;



  // Required fields validation
  if (!hash || !providerId || !userId || !gameId || !roundId || !amount || !reference || !timestamp) {
    return res.json({ error: 7, description: "Missing required parameter(s)" });
  }

  // Validate hash including optional fields if provided
  const calculatedHash = calculateHash({
    providerId,
    userId,
    token,
    gameId,
    roundId,
    amount,
    reference,
    timestamp,
    roundDetails,
    bonusCode,
    platform,
    promoWinAmount,
    promoWinReference,
    promoCampaignID,
    promoCampaignType,
    specPrizes
  }, SECRET_KEY);

  if (calculatedHash !== hash) {
    return res.json({ error: 2, description: "Invalid hash" });
  }

  // Lookup player
  const player = Object.values(playersDB).find(p => p.userId === userId);
  if (!player) return res.json({ error: 1, description: "Player not found" });

  // Ensure idempotency using reference
  if (!global.resultHistory) global.resultHistory = {};
  if (global.resultHistory[reference]) {
    return res.json(global.resultHistory[reference]);
  }

  // Add win amount to player's cash
  player.cash += parseFloat(amount);

  // Handle promo wins if provided
  if (promoWinAmount && promoWinReference && promoCampaignID && promoCampaignType) {
    player.cash += parseFloat(promoWinAmount);
    // Optional: store promo win for history
    if (!player.promoHistory) player.promoHistory = [];
    player.promoHistory.push({
      promoWinAmount,
      promoWinReference,
      promoCampaignID,
      promoCampaignType
    });
  }

  // Optional: handle bingo-specific special prizes
  if (Array.isArray(specPrizes)) {
    if (!player.specPrizes) player.specPrizes = [];
    specPrizes.forEach(prize => {
      player.specPrizes.push(prize);
    });
  }

  const response = {
    transactionId: Date.now(),
    currency: player.currency,
    cash: player.cash,
    bonus: player.bonus,
    error: 0,
    description: "Success"
  };

  // Store transaction to ensure idempotency
  global.resultHistory[reference] = response;

  res.json(response);
});


// POST /refund.html
router.post("/refund", express.urlencoded({ extended: true }), (req, res) => {
  const {
    hash,
    providerId,
    userId,
    reference,
    token,
    amount,
    platform,
    gameId,
    roundId,
    timestamp,
    roundDetails,
    bonusCode
  } = req.body;


  // Validate required fields
  if (!hash || !providerId || !userId || !reference) {
    return res.json({ error: 7, description: "Missing required parameter(s)" });
  }

  // Hash validation (you can include optional fields if needed)
  const calculatedHash = calculateHash({
    providerId,
    userId,
    token,
    reference,
    amount,
    platform,
    gameId,
    roundId,
    timestamp,
    roundDetails,
    bonusCode
  }, SECRET_KEY);

  if (calculatedHash !== hash) {
    return res.json({ error: 2, description: "Invalid hash" });
  }

  // Lookup player
  const player = Object.values(playersDB).find(p => p.userId === userId);
  if (!player) return res.json({ error: 1, description: "Player not found" });

  // Idempotency: store refunded references
  if (!global.refundHistory) global.refundHistory = {};
  if (global.refundHistory[reference]) {
    return res.json(global.refundHistory[reference]);
  }

  // Find original bet transaction (optional, fallback: success even if not found)
  const originalBet = player.bets?.find(b => b.reference === reference);

  if (originalBet) {
    const refundAmount = amount ? parseFloat(amount) : originalBet.amount;
    player.cash += refundAmount;

    // Optional: mark bet as refunded
    originalBet.refunded = true;
  } else {
    // If bet not found, just return success as per docs
  }

  const response = {
    transactionId: "R" + Date.now(), // unique refund transaction id
    error: 0,
    description: "Success"
  };

  // Store response for idempotency
  global.refundHistory[reference] = response;

  res.json(response);
});



// POST /endRound.html
router.post("/endRound", express.urlencoded({ extended: true }), (req, res) => {
  const {
    hash,
    providerId,
    userId,
    gameId,
    roundId,
    token,
    bonusCode,
    platform,
    roundDetails,
    win,
    specPrizes
  } = req.body;

  const SECRET_KEY = process.env.PP_SECRET || "YOUR_SECRET_KEY";

  // Validate required fields
  if (!hash || !providerId || !userId || !gameId || !roundId) {
    return res.json({ error: 7, description: "Missing required parameter(s)" });
  }

  // Validate hash
  const calculatedHash = calculateHash({
    providerId,
    userId,
    gameId,
    roundId,
    token,
    bonusCode,
    platform,
    roundDetails,
    win,
    specPrizes
  }, SECRET_KEY);

  if (calculatedHash !== hash) {
    return res.json({ error: 2, description: "Invalid hash" });
  }

  // Lookup player
  const player = Object.values(playersDB).find(p => p.userId === userId);
  if (!player) return res.json({ error: 1, description: "Player not found" });

  // Idempotency: store finalized rounds
  if (!global.finalizedRounds) global.finalizedRounds = {};
  if (global.finalizedRounds[roundId]) {
    return res.json(global.finalizedRounds[roundId]);
  }

  // Optionally update balance if win is provided (notification only)
  if (win) {
    const winAmount = parseFloat(win);
    player.cash += winAmount;
  }

  // Optional: handle bingo spec prizes
  if (specPrizes && Array.isArray(specPrizes)) {
    player.specPrizes = player.specPrizes || [];
    player.specPrizes.push(...specPrizes);
  }

  const response = {
    cash: player.cash,
    bonus: player.bonus || 0,
    error: 0,
    description: "Success"
  };

  // Store response for idempotency
  global.finalizedRounds[roundId] = response;

  res.json(response);
});

// POST /bonusWin.html
router.post("/bonusWin", express.urlencoded({ extended: true }), (req, res) => {
  const {
    hash,
    providerId,
    userId,
    amount,
    reference,
    bonusCode,
    roundId,
    gameId,
    token,
    requestId,
    remainAmount,
    specPrizes
  } = req.body;



  // Validate required fields
  if (!hash || !providerId || !userId || !amount || !reference || !bonusCode) {
    return res.json({ error: 7, description: "Missing required parameter(s)" });
  }

  // Validate hash (including optional fields if needed)
  const calculatedHash = calculateHash({
    providerId, userId, amount, reference, bonusCode, roundId, gameId, token, requestId, remainAmount
  }, SECRET_KEY);

  if (calculatedHash !== hash) {
    return res.json({ error: 2, description: "Invalid hash" });
  }

  // Lookup player
  const player = Object.values(playersDB).find(p => p.userId === userId);
  if (!player) return res.json({ error: 1, description: "Player not found" });

  // Idempotency: store processed references
  if (!global.processedBonusWins) global.processedBonusWins = {};
  if (global.processedBonusWins[reference]) {
    return res.json(global.processedBonusWins[reference]);
  }

  // Add bonus win amount
  const winAmount = parseFloat(amount);
  player.cash += winAmount;

  // Store specPrizes if provided
  if (specPrizes && Array.isArray(specPrizes)) {
    player.specPrizes = player.specPrizes || [];
    player.specPrizes.push(...specPrizes);
  }

  const response = {
    transactionId: Date.now(),
    currency: "USD",
    cash: player.cash,
    bonus: player.bonus || 0,
    error: 0,
    description: "Success"
  };

  // Save for idempotency
  global.processedBonusWins[reference] = response;

  res.json(response);
});


// POST /jackpotWin.html
router.post("/jackpotWin", express.urlencoded({ extended: true }), (req, res) => {
  const {
    hash,
    providerId,
    timestamp,
    userId,
    gameId,
    roundId,
    jackpotId,
    jackpotDetails,
    amount,
    reference,
    platform,
    token,
    balanceBeforeWin,
    balanceAfterWin,
    instanceId,
    specPrizes
  } = req.body;


  // Validate required fields
  if (!hash || !providerId || !timestamp || !userId || !gameId || !roundId || !jackpotId || !amount || !reference) {
    return res.json({ error: 7, description: "Missing required parameter(s)" });
  }

  // Validate hash
  const calculatedHash = calculateHash({
    providerId, timestamp, userId, gameId, roundId, jackpotId, amount, reference, platform, token
  }, SECRET_KEY);

  if (calculatedHash !== hash) {
    return res.json({ error: 2, description: "Invalid hash" });
  }

  // Lookup player
  const player = Object.values(playersDB).find(p => p.userId === userId);
  if (!player) return res.json({ error: 1, description: "Player not found" });

  // Idempotency: store processed references
  if (!global.processedJackpotWins) global.processedJackpotWins = {};
  if (global.processedJackpotWins[reference]) {
    return res.json(global.processedJackpotWins[reference]);
  }

  // Add jackpot amount
  const winAmount = parseFloat(amount);
  player.cash += winAmount;

  // Store specPrizes if provided
  if (specPrizes && Array.isArray(specPrizes)) {
    player.specPrizes = player.specPrizes || [];
    player.specPrizes.push(...specPrizes);
  }

  const response = {
    transactionId: Date.now(),
    currency: "USD",
    cash: player.cash,
    bonus: player.bonus || 0,
    error: 0,
    description: "Success"
  };

  // Save for idempotency
  global.processedJackpotWins[reference] = response;

  res.json(response);
});



// POST /adjustment.html
router.post("/adjustment", express.urlencoded({ extended: true }), (req, res) => {
  const {
    hash,
    userId,
    gameId,
    token,
    roundId,
    amount,
    reference,
    providerId,
    validBetAmount,
    timestamp,
    roundDetails,
    bonusCode
  } = req.body;



  // Validate required fields
  if (!hash || !userId || !gameId || !roundId || !amount || !reference || !providerId || !validBetAmount || !timestamp) {
    return res.json({ error: 7, description: "Missing required parameter(s)" });
  }

  // Validate hash
  const calculatedHash = calculateHash({ userId, gameId, roundId, amount, reference, providerId, validBetAmount, timestamp }, SECRET_KEY);
  if (calculatedHash !== hash) {
    return res.json({ error: 2, description: "Invalid hash" });
  }

  // Lookup player
  const player = Object.values(playersDB).find(p => p.userId === userId);
  if (!player) return res.json({ error: 1, description: "Player not found" });

  // Idempotency: store processed references
  if (!global.processedAdjustments) global.processedAdjustments = {};
  if (global.processedAdjustments[reference]) {
    return res.json(global.processedAdjustments[reference]);
  }

  const adjAmount = parseFloat(amount);

  // Check for negative adjustment and insufficient balance
  if (adjAmount < 0 && player.cash < Math.abs(adjAmount)) {
    return res.json({ error: 1, description: "Insufficient balance", transactionId: null, cash: player.cash, bonus: player.bonus || 0, currency: "USD" });
  }

  // Apply adjustment
  player.cash += adjAmount;

  const response = {
    transactionId: Date.now(),
    currency: "USD",
    cash: player.cash,
    bonus: player.bonus || 0,
    error: 0,
    description: "Success"
  };

  // Store for idempotency
  global.processedAdjustments[reference] = response;

  res.json(response);
});







module.exports = router;
