const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const authMiddleware = require("../middleware/authMiddleware"); // ✅ Verify JWT
const pool = require("../services/db"); // ✅ PostgreSQL
const router = express.Router();
const md5 = require("md5"); 
const { v4: uuidv4 } = require("uuid");

require('dotenv').config();

// === CONFIG ===
const FASTSPIN_URL = "https://api-egame-staging.fsuat.com/api";
const MERCHANT_CODE = "CASINO1";
const SECRET_KEY = "CASINO1ctegbeajLq4Wbeaj";

console.log("🚀 fastspingame.js routes loaded");


// === UTILS ===
// stable stringify to avoid digest mismatch
function stableStringify(obj) {
  return JSON.stringify(
    obj,
    Object.keys(obj).sort()
  );
}

function generateDigest(payload) {
  const json = stableStringify(payload);
  const digest = crypto.createHash("md5").update(json + SECRET_KEY, "utf8").digest("hex");
  console.log("🔑 Digest Input:", json + SECRET_KEY);
  console.log("🔐 Digest:", digest);
  return digest;
}
// ⚠️ Catch-all wallet route for debugging FastSpin misconfig
// router.post("/wallet", (req, res) => {
//   console.log("⚡ FS hit /wallet instead of /wallet/getBalance|debit|credit");
//   console.log("📥 Incoming Body:", req.body);

//   return res.status(400).json({
//     code: 400,
//     msg: "Invalid wallet endpoint. Expected /wallet/getBalance, /wallet/debit, or /wallet/credit",
//   });
// });

// ========== DEBUG ROUTE (no auth, no db) ==========
router.get("/test-fastspin", async (req, res) => {
  const payload = {
    merchantCode: MERCHANT_CODE,
    serialNo: Date.now().toString()
  };
  const headers = {
    API: "getGames",
    DataType: "JSON",
    Digest: generateDigest(payload),
    "Content-Type": "application/json"
  };

  try {
    const response = await axios.post(FASTSPIN_URL, payload, { headers });
    return res.json(response.data);
  } catch (error) {
    console.error("❌ FastSpin test error:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      headers: error.response?.headers
    });
    return res.status(error.response?.status || 500).json({
      error: error.response?.data || error.message
    });
  }
});

// ========== GET ALL GAMES ==========
router.get("/games", authMiddleware, async (req, res) => {
console.log("🚀 fastspingame.js routes loaded");

  try {
    const payload = {
      merchantCode: MERCHANT_CODE,
      serialNo: Date.now().toString()
    };

    const headers = {
      API: "getGames",
      DataType: "JSON",
      Digest: generateDigest(payload),
      "Content-Type": "application/json"
    };

    const response = await axios.post(FASTSPIN_URL, payload, { headers });

    console.log("🎮 FastSpin Games Response:", JSON.stringify(response.data, null, 2));

    // Attach user's balance
    const user = await pool.query(
      "SELECT balance FROM users WHERE id = $1",
      [req.user.id]
    );

    res.json({
      games: response.data,
      balance: user.rows[0]?.balance || 0
    });

  } catch (error) {
    console.error("❌ Error fetching games:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      headers: error.response?.headers
    });
    res.status(error.response?.status || 500).json({
      error: error.response?.data || "Failed to fetch games"
    });
  }
});

// ========== AUTHORIZE GAME ==========


function generateSerialNo() {
  return Date.now().toString();
}





router.post("/get-authorized", authMiddleware, async (req, res) => {
  try {
    const user = req.user;

    if (!user || !user.id || !user.currency) {
      return res.status(400).json({ error: "Invalid user profile" });
    }

    const { gameCode, isLobby } = req.body;

    // 1️⃣ Generate serialNo
    const serialNo = Date.now().toString();

    // 2️⃣ Generate token
    const token = crypto.randomBytes(16).toString("hex");

    // 3️⃣ Build payload
    const payloadBody = {
      merchantCode: MERCHANT_CODE,
      acctInfo: {
        acctId: user.id.toString(),
        userName: user.username || user.full_name || `User${user.id}`,
        currency: user.currency || "USD",
        siteId: process.env.SITE_ID || "SITE_DEFAULT",
        balance: user.balance || 0
      },
      language: "en_US",
      token,
      acctIp: req.ip === "::1" ? "8.8.8.8" : req.ip,
      mobile: "true",
      fun: "false",
      menuMode: "true",
      exitUrl: "http://www.domain.example.com",
      fullScreen: "true",
      serialNo
    };

    if (isLobby) {
      payloadBody.lobby = "FS";
    } else {
      payloadBody.game = gameCode;
    }

    const bodyString = JSON.stringify(payloadBody);

    // 4️⃣ Compute Digest (MD5 of body string + SECRET_KEY)
    const digest = crypto
      .createHash("md5")
      .update(bodyString + SECRET_KEY, "utf8")
      .digest("hex");

    console.log("📡 Outgoing getAuthorize payload:", payloadBody);
    console.log("🔑 Computed Digest:", digest);

    // 5️⃣ Call FastSpin API
    const fsResponse = await axios.post(
      `${FASTSPIN_URL}/getAuthorize`,
      bodyString,
      {
        headers: {
          "Content-Type": "application/json",
          "API": "authorize",
          "DataType": "JSON",
          "Digest": digest
        }
      }
    );

    console.log("🎯 FastSpin response:", fsResponse.data);

    if (fsResponse.data.code === 0 && fsResponse.data.gameUrl) {
      return res.json({ url: fsResponse.data.gameUrl });
    } else {
      return res.status(400).json({ error: fsResponse.data.msg });
    }
  } catch (err) {
    console.error(
      "❌ Error in get-authorized:",
      err.response?.data || err.message
    );
    res.status(500).json({ error: "Game authorization failed" });
  }
});




// ✅ Verify digest

// ✅ Digest verification (use raw body string, not JSON.stringify of parsed object)


// --- Digest verification helper ---


function verifyDigest(rawBody, secretKey, incomingDigest) {
  const calc = crypto
    .createHash("md5")
    .update(rawBody + secretKey, "utf8")
    .digest("hex");
  return calc === incomingDigest;
}



router.post("/wallet", async (req, res) => {
  console.log("===============================================");
  console.log("📩 Incoming Wallet Request at", new Date().toISOString());
  console.log("Headers:", JSON.stringify(req.headers, null, 2));
  console.log("Body:", JSON.stringify(req.body, null, 2));

  const rawBody = req.rawBody || JSON.stringify(req.body);
  const incomingDigest = req.headers["digest"];
  const calcDigest = crypto
    .createHash("md5")
    .update(rawBody + SECRET_KEY, "utf8")
    .digest("hex");

  console.log("🔑 Incoming digest:", incomingDigest);
  console.log("🧮 Calculated digest:", calcDigest);

  if (incomingDigest !== calcDigest) {
    console.error("❌ Digest mismatch!");
    const response = {
      serialNo: req.body.serialNo || uuidv4(),
      merchantCode: "CASINO1",
      code: 401,
      msg: "Invalid digest",
    };
    console.log("📤 Responding (Digest error):", JSON.stringify(response));
    return res.status(400).json(response);
  }

  const {
    serialNo,
    transferId,
    acctId,
    currency,
    amount,
    type,
    gameCode,
    referenceId,
  } = req.body;

  try {
    // ✅ Ensure user exists
    const userQ = await pool.query(
      "SELECT id, balance, currency FROM users WHERE id = $1",
      [acctId]
    );
    if (!userQ.rows.length) {
      console.warn(`❌ User not found: acctId=${acctId}`);
      const response = {
        serialNo,
        merchantCode: "CASINO1",
        code: 404,
        msg: "User not found",
      };
      console.log("📤 Responding (User not found):", JSON.stringify(response));
      return res.json(response);
    }

    let user = userQ.rows[0];
    let balance = parseFloat(user.balance);
    let dbCurrency = user.currency || "USD";
    console.log(
      `👤 User found: id=${user.id}, balance=${balance}, currency=${dbCurrency}`
    );

    // ✅ CASE 1: Balance check
    if (!transferId && type === undefined) {
      console.log("🔍 Detected Balance Check Request");
      const response = {
        acctInfo: {
          userName: `Player_${acctId}`,
          currency: dbCurrency,
          acctId: String(acctId),
          balance: Number(balance),
        },
        merchantCode: "CASINO1",
        msg: "success",
        code: 0,
        serialNo,
      };
      console.log("📤 Responding (Balance Check):", JSON.stringify(response));
      res.setHeader("Content-Type", "application/json; charset=UTF-8");
      return res.json(response);
    }

    // ✅ CASE 2: Transfer
    if (!transferId || !currency || amount === undefined || !type) {
      console.error("❌ Missing required fields for transfer:", req.body);
      const response = {
        serialNo,
        merchantCode: "CASINO1",
        code: 400,
        msg: "Missing required fields for transfer",
      };
      console.log("📤 Responding (Bad request):", JSON.stringify(response));
      return res.status(400).json(response);
    }

    // ✅ Idempotency check
    const existing = await pool.query(
      "SELECT * FROM fs_transactions WHERE transfer_id = $1",
      [transferId]
    );
    if (existing.rows.length) {
      console.warn(`⚠️ Duplicate transferId ${transferId}, returning existing result`);
      const response = {
        transactionId: existing.rows[0].id.toString(),
        afterBalance: Number(existing.rows[0].balance_after),
        merchantCode: "CASINO1",
        msg: "success (duplicate ignored)",
        code: 0,
        serialNo,
      };
      console.log("📤 Responding (Duplicate):", JSON.stringify(response));
      return res.json(response);
    }

    await pool.query("BEGIN");
    console.log(`⚙️ Processing transfer: type=${type}, amount=${amount}, acctId=${acctId}`);

    // ✅ Process transaction types
    if (type === 1) {
      console.log("🎲 Place Bet request");
      if (balance < amount) {
        console.warn("⚠️ Insufficient funds");
        await pool.query("ROLLBACK");
        const response = {
          serialNo,
          merchantCode: "CASINO1",
          code: 402,
          msg: "Insufficient funds",
        };
        console.log("📤 Responding (Insufficient funds):", JSON.stringify(response));
        return res.json(response);
      }
      balance -= amount;
    } else if (type === 2) {
      console.log("↩️ Cancel Bet request");
      balance += amount;
    } else if (type === 4) {
      console.log("💰 Payout request");
      balance += amount;
    } else if (type === 7) {
      console.log("🎁 Bonus credit request");
      balance += amount;
    } else {
      console.error("❌ Unknown transfer type:", type);
      await pool.query("ROLLBACK");
      const response = {
        serialNo,
        merchantCode: "CASINO1",
        code: 400,
        msg: "Unknown transfer type",
      };
      console.log("📤 Responding (Unknown type):", JSON.stringify(response));
      return res.status(400).json(response);
    }

    // ✅ Update user balance
    await pool.query("UPDATE users SET balance = $1 WHERE id = $2", [
      balance,
      acctId,
    ]);
    console.log(`💾 Balance updated in DB: newBalance=${balance}`);

    // ✅ Save transaction
    const insertRes = await pool.query(
      `INSERT INTO fs_transactions 
       (transfer_id, acct_id, type, amount, balance_after, game_code, reference_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [transferId, acctId, type, amount, balance, gameCode || null, referenceId || null]
    );

    await pool.query("COMMIT");
    const newTxId = insertRes.rows[0].id.toString();
    console.log(`✅ Transfer recorded: transferId=${transferId}, transactionId=${newTxId}`);

    // ✅ Respond to FastSpin
    const response = {
      transactionId: newTxId,
      afterBalance: Number(balance),
      merchantCode: "CASINO1",
      msg: "success",
      code: 0,
      serialNo,
    };
    console.log("📤 Responding (Transfer):", JSON.stringify(response));
    res.setHeader("Content-Type", "application/json; charset=UTF-8");
    return res.json(response);

  } catch (err) {
    console.error("❌ Wallet server error:", err);
    await pool.query("ROLLBACK").catch(() => {});
    return res.status(500).json({ code: 500, msg: "Wallet server error" });
  }
});
















//balace 
function createDigest(body, secretKey) {
  const raw = JSON.stringify(body) + secretKey;
  return md5(raw).toString();
}

// ✅ Helper: Validate digest from FS
/* -------------------- WALLET ROUTES -------------------- */













// router.post("/wallet/getBalance", verifyFSDigest, async (req, res) => {
//   const { acctId, currency } = req.body;
//   console.log("⚡ FS -> getBalance request:", req.body);

//   try {
//     const { rows } = await pool.query("SELECT balance FROM users WHERE id=$1", [acctId]);
//     const balance = rows[0]?.balance || 0;

//     console.log(`💰 Returning balance for acctId=${acctId}: ${balance}`);

//     return res.json({
//       acctId,
//       currency,
//       balance,
//       code: 0,
//       msg: "success",
//     });
//   } catch (err) {
//     console.error("❌ getBalance error:", err);
//     return res.json({ code: 500, msg: "internal error" });
//   }
// });



// ⚠️ Catch-all wallet route for debugging FastSpin misconfig
// ⚠️ Catch-all wallet route for debugging FastSpin misconfig
// router.post("/wallet", (req, res) => {
//   console.log("⚡ FS hit /wallet instead of /wallet/getBalance|debit|credit");
//   console.log("📥 Incoming Body:", req.body);

//   return res.status(400).json({
//     code: 400,
//     msg: "Invalid wallet endpoint. Expected /wallet/getBalance, /wallet/debit, or /wallet/credit",
//   });
// });



// router.post("/wallet/debit", verifyFSDigest, async (req, res) => {
//   const { acctId, amount, currency, transactionId } = req.body;
//   console.log("⚡ FS -> debit request:", req.body);

//   try {
//     await pool.query("BEGIN");
//     const { rows } = await pool.query("SELECT balance FROM users WHERE id=$1", [acctId]);

//     if (!rows[0] || rows[0].balance < amount) {
//       console.warn(`⚠️ Insufficient funds for acctId=${acctId}`);
//       return res.json({ code: 101, msg: "Insufficient funds" });
//     }

//     const newBalance = rows[0].balance - amount;
//     await pool.query("UPDATE users SET balance=$1 WHERE id=$2", [newBalance, acctId]);
//     await pool.query(
//       "INSERT INTO fastspin_transactions (user_id, type, amount, balance_after, transaction_id) VALUES ($1,$2,$3,$4,$5)",
//       [acctId, "debit", amount, newBalance, transactionId]
//     );
//     await pool.query("COMMIT");

//     console.log(`💸 Debit success acctId=${acctId}, newBalance=${newBalance}`);

//     return res.json({
//       acctId,
//       balance: newBalance,
//       code: 0,
//       msg: "success",
//     });
//   } catch (err) {
//     await pool.query("ROLLBACK");
//     console.error("❌ Debit error:", err);
//     return res.json({ code: 500, msg: "internal error" });
//   }
// });

// router.post("/wallet/credit", verifyFSDigest, async (req, res) => {
//   const { acctId, amount, currency, transactionId } = req.body;
//   console.log("⚡ FS -> credit request:", req.body);

//   try {
//     await pool.query("BEGIN");
//     const { rows } = await pool.query("SELECT balance FROM users WHERE id=$1", [acctId]);
//     if (!rows[0]) {
//       console.warn(`⚠️ User not found acctId=${acctId}`);
//       return res.json({ code: 102, msg: "User not found" });
//     }

//     const newBalance = rows[0].balance + amount;
//     await pool.query("UPDATE users SET balance=$1 WHERE id=$2", [newBalance, acctId]);
//     await pool.query(
//       "INSERT INTO fastspin_transactions (user_id, type, amount, balance_after, transaction_id) VALUES ($1,$2,$3,$4,$5)",
//       [acctId, "credit", amount, newBalance, transactionId]
//     );
//     await pool.query("COMMIT");

//     console.log(`💰 Credit success acctId=${acctId}, newBalance=${newBalance}`);

//     return res.json({
//       acctId,
//       balance: newBalance,
//       code: 0,
//       msg: "success",
//     });
//   } catch (err) {
//     await pool.query("ROLLBACK");
//     console.error("❌ Credit error:", err);
//     return res.json({ code: 500, msg: "internal error" });
//   }
// });
// 👉 Balance
// router.post("/wallet/getBalance", async (req, res) => {
//   const digestHeader = req.headers["digest"];
//   if (!validateDigest(req.body, digestHeader)) {
//     return res.json({ code: 106, msg: "Invalid digest" });
//   }

//   const { acctId, currency } = req.body;
//   const { rows } = await pool.query("SELECT balance FROM users WHERE id=$1", [acctId]);

//   return res.json({
//     acctId,
//     currency,
//     balance: rows[0]?.balance || 0,
//     code: 0,
//     msg: "success",
//   });
// });

// // 👉 Debit (bet)
// router.post("/wallet/debit", async (req, res) => {
//   const digestHeader = req.headers["digest"];
//   if (!validateDigest(req.body, digestHeader)) {
//     return res.json({ code: 106, msg: "Invalid digest" });
//   }

//   const { acctId, amount, currency, transactionId } = req.body;

//   try {
//     await pool.query("BEGIN");
//     const { rows } = await pool.query("SELECT balance FROM users WHERE id=$1", [acctId]);

//     if (!rows[0] || rows[0].balance < amount) {
//       await pool.query("ROLLBACK");
//       return res.json({ code: 101, msg: "Insufficient funds" });
//     }

//     const newBalance = rows[0].balance - amount;

//     await pool.query("UPDATE users SET balance=$1 WHERE id=$2", [newBalance, acctId]);
//     await pool.query(
//       "INSERT INTO transactions (user_id, type, amount, balance_after, transaction_id) VALUES ($1,$2,$3,$4,$5)",
//       [acctId, "debit", amount, newBalance, transactionId]
//     );

//     await pool.query("COMMIT");

//     return res.json({
//       acctId,
//       balance: newBalance,
//       code: 0,
//       msg: "success",
//     });
//   } catch (err) {
//     await pool.query("ROLLBACK");
//     console.error("Debit error:", err);
//     return res.json({ code: 500, msg: "internal error" });
//   }
// });

// // 👉 Credit (win)
// router.post("/wallet/credit", async (req, res) => {
//   const digestHeader = req.headers["digest"];
//   if (!validateDigest(req.body, digestHeader)) {
//     return res.json({ code: 106, msg: "Invalid digest" });
//   }

//   const { acctId, amount, currency, transactionId } = req.body;

//   try {
//     await pool.query("BEGIN");
//     const { rows } = await pool.query("SELECT balance FROM users WHERE id=$1", [acctId]);

//     if (!rows[0]) {
//       await pool.query("ROLLBACK");
//       return res.json({ code: 102, msg: "User not found" });
//     }

//     const newBalance = rows[0].balance + amount;

//     await pool.query("UPDATE users SET balance=$1 WHERE id=$2", [newBalance, acctId]);
//     await pool.query(
//       "INSERT INTO transactions (user_id, type, amount, balance_after, transaction_id) VALUES ($1,$2,$3,$4,$5)",
//       [acctId, "credit", amount, newBalance, transactionId]
//     );

//     await pool.query("COMMIT");

//     return res.json({
//       acctId,
//       balance: newBalance,
//       code: 0,
//       msg: "success",
//     });
//   } catch (err) {
//     await pool.query("ROLLBACK");
//     console.error("Credit error:", err);
//     return res.json({ code: 500, msg: "internal error" });
//   }
// });

/* -------------------- LAUNCH GAME -------------------- */

router.post("/launch-game", authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    const { gameCode, isLobby } = req.body;

    if (!user || !user.id || !user.currency) {
      return res.status(400).json({ error: "Invalid user profile" });
    }

    // Step 1: Build authorize payload
    const serialNo = Date.now().toString();
    const token = crypto.randomBytes(16).toString("hex");

    const payload = {
      merchantCode: MERCHANT_CODE,
      acctInfo: {
        acctId: user.id.toString(),
        userName: user.username || user.full_name || `User${user.id}`,
        currency: user.currency,
        siteId: process.env.SITE_ID || "SITE_DEFAULT",
        balance: user.balance || 0, // FS updates via wallet APIs
      },
      language: "en_US",
      token,
      acctIp: req.ip?.replace("::1", "127.0.0.1") || "127.0.0.1",
      serialNo,
      mobile: "true",
    };

    if (isLobby) {
      payload.lobby = "FS";
    } else {
      payload.game = gameCode;
      payload.fun = "false";
      payload.menuMode = "true";
      payload.exitUrl = "http://www.domain.example.com";
      payload.fullScreen = "true";
    }

    // Step 2: Digest header
    const digest = createDigest(payload, SECRET_KEY);

    // Step 3: Call FastSpin
    const fsResponse = await axios.post(`${FASTSPIN_URL}/getAuthorize`, payload, {
      headers: {
        "Content-Type": "application/json",
        "API": "authorize",
        "DataType": "JSON",
        "Digest": digest,
      },
    });

    console.log("🎯 FastSpin getAuthorize Response:", fsResponse.data);

    if (fsResponse.data.code === 0) {
      return res.json({
        url: fsResponse.data.gameUrl,
        token: fsResponse.data.token,
        serialNo: fsResponse.data.serialNo,
      });
    } else {
      return res.status(400).json({ error: fsResponse.data.msg });
    }
  } catch (err) {
    console.error("❌ Launch Game Error:", err.response?.data || err.message);
    return res.status(500).json({ error: "Game launch failed" });
  }
});










module.exports = router;
