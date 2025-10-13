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















































































// const express = require('express');
// const bodyParser = require('body-parser');
// const crypto = require('crypto');

// // --- 1. Configuration and Constants ---
// const app = express();
// const PORT = 3000;
// // NOTE: This must be the secret key provided by Pragmatic Play for HASH calculation.
// const OPERATOR_SECRET = 'YOUR_PP_SHARED_SECRET_KEY';
// const INTEGRATION_API_PATH = '/api/pragmatic/seamless';

// // Pragmatic Play requires specific error codes.
// const ERROR_CODES = {
//     SUCCESS: 0,
//     INSUFFICIENT_FUNDS: 1,
//     TRANSACTION_NOT_FOUND: 2,
//     INVALID_HASH: 3,
//     PLAYER_NOT_FOUND: 4,
//     GENERAL_ERROR: 100,
// };

// // --- 2. Database Simulation (Replace with your actual database/wallet service) ---

// /**
//  * Simulates the Operator's Player Wallet/DB.
//  * Key: userId, Value: { balance, currency, transactions: { txId: { type, amount, roundId } } }
//  */
// const playerDatabase = {
//     'player_demo_123': {
//         balance: 1000.00,
//         currency: 'USD',
//         transactions: {
//             'tx_bet_001': { type: 'DEBIT (BET)', amount: -10.00, roundId: 'r001', gameId: 'vs1000', timestamp: Date.now() - 5000 },
//             'tx_win_001': { type: 'CREDIT (WIN)', amount: 25.50, roundId: 'r001', gameId: 'vs1000', timestamp: Date.now() - 4000 },
//             'tx_bet_002': { type: 'DEBIT (BET)', amount: -5.00, roundId: 'r002', gameId: 'sd2000', timestamp: Date.now() - 3000 },
//             'tx_win_002': { type: 'CREDIT (WIN)', amount: 0.00, roundId: 'r002', gameId: 'sd2000', timestamp: Date.now() - 2000 },
//             'tx_refund_001': { type: 'CREDIT (REFUND)', amount: 15.00, roundId: 'r003', gameId: 'vs1000', timestamp: Date.now() - 1000 },
//         },
//     },
//     'player_demo_456': {
//         balance: 50.00,
//         currency: 'EUR',
//         transactions: {},
//     }
// };

// /**
//  * Simulates the response from the Integration API's GetCasinoGames method.
//  */
// const gameList = [
//     { gameId: 'vs1000', gameName: 'Gates of Olympus', gameType: 'SLOT', provider: 'Pragmatic Play' },
//     { gameId: 'sd2000', gameName: 'Sweet Bonanza', gameType: 'SLOT', provider: 'Pragmatic Play' },
//     { gameId: 'lc3000', gameName: 'Blackjack Azure', gameType: 'LIVE', provider: 'Pragmatic Play Live' },
// ];

// // --- 3. Utility Functions ---

// /**
//  * Helper function to send standardized API responses (Seamless Wallet).
//  * @param {number} code - The Pragmatic Play error code (0 for success).
//  * @param {number} balance - The player's current balance.
//  * @param {string} transactionId - The ID of the transaction that was just processed.
//  * @param {string} currency - The player's currency.
//  */
// const buildWalletResponse = (code, balance, transactionId, currency, message = '') => ({
//     errorCode: code,
//     errorMessage: message,
//     // Ensure balance is a string with two decimal places.
//     balance: parseFloat(balance).toFixed(2),
//     currency: currency,
//     transactionId: transactionId,
// });

// /**
//  * Calculates and validates the request hash (checksum).
//  * This is a critical security step. **MUST BE IMPLEMENTED ACCURATELY.**
//  */
// const validateHash = (req) => {
//     // NOTE: This remains a simplified placeholder. In production, this must match
//     // the exact, complex HMAC-SHA256 calculation specified by Pragmatic Play.
//     const receivedHash = req.query.hash;
//     if (!receivedHash) return false;
//     return true; // SIMULATION: Always returns true to allow logic testing
// };

// // --- 4. Middleware Setup ---
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: true }));

// // --- 5. New: Game List Endpoint (Simulating GetCasinoGames) ---

// /**
//  * Endpoint to simulate the retrieval of the game list (Integration API).
//  * In a real integration, this would be an API call *from* your server to PP's server.
//  * Here, we simulate the *result* of that call.
//  */
// app.get('/api/gamelist', (req, res) => {
//     console.log('--- Responding to Game List Request ---');
//     res.json({
//         errorCode: 0,
//         description: 'Game list retrieved successfully (simulated).',
//         games: gameList,
//     });
// });

// // --- 6. New: Transaction History Endpoint (Simulating Data Feeds) ---

// /**
//  * Endpoint to retrieve player transaction history (Simulating Data Feeds/Game Rounds Report).
//  */
// app.get('/api/transactions/:userId', (req, res) => {
//     const userId = req.params.userId;
//     const player = playerDatabase[userId];

//     console.log(`--- Responding to Transaction History Request for ${userId} ---`);

//     if (!player) {
//         return res.status(404).json({ errorCode: ERROR_CODES.PLAYER_NOT_FOUND, errorMessage: 'Player not found.' });
//     }

//     const transactions = player.transactions;
//     const history = Object.keys(transactions).map(txId => {
//         const tx = transactions[txId];
//         // Determine if it's a debit or credit for display
//         const isDebit = tx.type.includes('DEBIT');
//         const amountDisplay = isDebit ? tx.amount.toFixed(2) : `+${tx.amount.toFixed(2)}`;
//         const typeDisplay = isDebit ? 'Debit (Bet/Adjustment)' : 'Credit (Win/Refund)';

//         return {
//             transactionId: txId,
//             timestamp: new Date(tx.timestamp).toISOString(),
//             roundId: tx.roundId,
//             gameId: tx.gameId,
//             transactionType: typeDisplay,
//             amount: amountDisplay,
//             currentBalance: 'N/A (Requires final calculation)', // Simulating a simple report, not a running balance
//         };
//     }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Sort by newest first

//     res.json({
//         errorCode: 0,
//         userId: userId,
//         currency: player.currency,
//         totalTransactions: history.length,
//         transactions: history,
//     });
// });

// // --- 7. Original: Pragmatic Play Seamless Wallet API Endpoint ---

// app.post(INTEGRATION_API_PATH, (req, res) => {
//     const action = req.query.action || req.body.action;
//     const body = req.body;
//     const { userId, currency, amount, transactionId, roundId } = body;

//     console.log(`\n--- Received Action: ${action.toUpperCase()} ---`);
//     console.log('Body:', body);

//     // 7.1. Security Check
//     if (!validateHash(req)) {
//         return res.status(401).json(buildWalletResponse(ERROR_CODES.INVALID_HASH, 0, transactionId, currency, 'Invalid request hash.'));
//     }

//     // 7.2. Player and Currency Validation
//     const player = playerDatabase[userId];
//     if (!player) {
//         return res.status(404).json(buildWalletResponse(ERROR_CODES.PLAYER_NOT_FOUND, 0, transactionId, currency, `Player ${userId} not found.`));
//     }
//     if (player.currency !== currency) {
//         return res.status(400).json(buildWalletResponse(ERROR_CODES.GENERAL_ERROR, player.balance, transactionId, currency, 'Currency mismatch.'));
//     }

//     // 7.3. Process Action
//     switch (action.toLowerCase()) {
//         case 'authenticate':
//             return res.json(buildWalletResponse(ERROR_CODES.SUCCESS, player.balance, null, player.currency, 'Authentication successful.'));

//         case 'balance':
//             return res.json(buildWalletResponse(ERROR_CODES.SUCCESS, player.balance, null, player.currency, 'Balance retrieved.'));

//         case 'bet':
//             const betAmount = parseFloat(amount);
//             if (player.transactions[transactionId]) {
//                 console.log(`Bet already processed: ${transactionId}`);
//                 return res.json(buildWalletResponse(ERROR_CODES.SUCCESS, player.balance, transactionId, player.currency, 'Bet already processed (idempotency).'));
//             }

//             if (player.balance < betAmount) {
//                 return res.status(400).json(buildWalletResponse(ERROR_CODES.INSUFFICIENT_FUNDS, player.balance, transactionId, player.currency, 'Insufficient funds for bet.'));
//             }

//             player.balance -= betAmount;
//             player.transactions[transactionId] = { type: 'DEBIT (BET)', amount: -betAmount, roundId, timestamp: Date.now() };
//             console.log(`BET: User ${userId} deducted ${betAmount}. New Balance: ${player.balance}`);
//             return res.json(buildWalletResponse(ERROR_CODES.SUCCESS, player.balance, transactionId, player.currency, 'Bet successful.'));

//         case 'result':
//             const winAmount = parseFloat(amount);
//             if (player.transactions[transactionId]) {
//                 console.log(`Result already processed: ${transactionId}`);
//                 return res.json(buildWalletResponse(ERROR_CODES.SUCCESS, player.balance, transactionId, player.currency, 'Result already processed (idempotency).'));
//             }

//             // Note: Even a 0.00 win needs to be recorded.
//             player.balance += winAmount;
//             player.transactions[transactionId] = { type: 'CREDIT (WIN)', amount: winAmount, roundId, timestamp: Date.now() };
//             console.log(`RESULT (Win): User ${userId} won ${winAmount}. New Balance: ${player.balance}`);
//             return res.json(buildWalletResponse(ERROR_CODES.SUCCESS, player.balance, transactionId, player.currency, 'Result successful.'));

//         case 'refund':
//              // Refund implementation remains complex due to finding the original transaction.
//              // For simplicity here, we assume a refund for the specified amount is requested.
//              const refundAmount = parseFloat(amount);
//              if (player.transactions[transactionId]) {
//                  console.log(`Refund already processed: ${transactionId}`);
//                  return res.json(buildWalletResponse(ERROR_CODES.SUCCESS, player.balance, transactionId, player.currency, 'Refund already processed (idempotency).'));
//              }

//              // Process refund (add the amount back)
//              player.balance += refundAmount;
//              player.transactions[transactionId] = { type: 'CREDIT (REFUND)', amount: refundAmount, roundId, timestamp: Date.now() };
//              console.log(`REFUND: User ${userId} refunded ${refundAmount}. New Balance: ${player.balance}`);
//              return res.json(buildWalletResponse(ERROR_CODES.SUCCESS, player.balance, transactionId, player.currency, 'Refund successful.'));

//         default:
//             console.warn(`Unknown action: ${action}`);
//             return res.status(400).json(buildWalletResponse(ERROR_CODES.GENERAL_ERROR, player.balance, transactionId, currency, 'Unknown API action.'));
//     }
// });

// // --- 8. Server Start ---

