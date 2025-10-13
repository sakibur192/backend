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



// routes/games.js (or a separate migration file)
router.post("/wallet-database", async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS fs_transactions (
        id SERIAL PRIMARY KEY,
        transfer_id VARCHAR(100) UNIQUE NOT NULL,
        acct_id INT NOT NULL,
        type INT NOT NULL,                -- 1=bet, 2=cancel, 3=rollback, 4=payout, 7=bonus
        amount NUMERIC(18,9) NOT NULL,
        balance_after NUMERIC(18,9) NOT NULL,
        game_code VARCHAR(50),
        reference_id VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    res.json({ success: true, msg: "✅ fs_transactions table ensured/created." });
  } catch (err) {
    console.error("❌ Failed to create fs_transactions table:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ View FastSpin Wallet Logs
router.get("/wallet/logs", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, created_at, headers, body FROM fs_wallet_logs ORDER BY id DESC LIMIT 50"
    );

    res.setHeader("Content-Type", "application/json; charset=UTF-8");
    return res.json({
      code: 0,
      msg: "success",
      logs: rows,
    });
  } catch (err) {
    console.error("❌ Failed to fetch fs_wallet_logs:", err.message);
    return res.status(500).json({ code: 500, msg: "Failed to fetch logs" });
  }
});







function verifyDigest(rawBody, secretKey, incomingDigest) {
  const calc = crypto
    .createHash("md5")
    .update(rawBody + secretKey, "utf8")
    .digest("hex");
  return calc === incomingDigest;
}




// POST /wallet - unified wallet (getBalance, debit, credit, rollback, cancel, bonus)
router.post("/wallet", async (req, res) => {
  console.log("===============================================");
  console.log("📩 Incoming Wallet Request at", new Date().toISOString());
  console.log("Headers:", JSON.stringify(req.headers, null, 2));
  console.log("Body:", JSON.stringify(req.body, null, 2));


    try {
    await pool.query(
      `INSERT INTO fs_wallet_logs (created_at, headers, body) VALUES (NOW(), $1, $2)`,
      [JSON.stringify(req.headers), JSON.stringify(req.body)]
    );
  } catch (err) {
    console.error("⚠️ Failed to insert into fs_wallet_logs:", err.message);
  }


  // rawBody: some proxies/frameworks provide rawBody; fallback to JSON.stringify(req.body)
  const rawBody = req.rawBody || JSON.stringify(req.body);
  const incomingDigest = (req.headers["digest"] || req.headers["Digest"] || "").toString();
  const calcDigest = crypto.createHash("md5").update(rawBody + SECRET_KEY, "utf8").digest("hex");

  console.log("🔑 Incoming digest:", incomingDigest);
  console.log("🧮 Calculated digest:", calcDigest);

  if (!incomingDigest || incomingDigest !== calcDigest) {
    console.error("❌ Digest mismatch!");
    const response = {
      serialNo: req.body.serialNo || uuidv4(),
      merchantCode: MERCHANT_CODE,
      code: 401,
      msg: "Invalid digest",
    };
    // sign response
    const respDigest = crypto.createHash("md5").update(JSON.stringify(response) + SECRET_KEY, "utf8").digest("hex");
    res.setHeader("Digest", respDigest);
    console.log("📤 Responding (Digest error):", JSON.stringify(response));
    return res.status(400).json(response);
  }

  const {
    serialNo = uuidv4(),
    transferId,
    acctId,
    currency,
    amount,
    type,
    gameCode,
    referenceId,
  } = req.body;

  const isBalanceCheck = !transferId && type === undefined;
  if (isBalanceCheck) {
    console.log("👉 Detected BALANCE CHECK request");
  } else {
    console.log("👉 Detected TRANSFER request");
    console.log(`   ➡️ type=${type}, transferId=${transferId}, amount=${amount}, gameCode=${gameCode}, referenceId=${referenceId}`);
  }

  // helper to send response and sign it
  function sendSigned(statusCode, responseObj) {
    try {
      const respDigest = crypto.createHash("md5").update(JSON.stringify(responseObj) + SECRET_KEY, "utf8").digest("hex");
      res.setHeader("Digest", respDigest);
      res.setHeader("Content-Type", "application/json; charset=UTF-8");
      return res.status(statusCode).json(responseObj);
    } catch (err) {
      console.error("❌ Failed to sign response:", err);
      return res.status(500).json({ code: 500, msg: "Server response error" });
    }
  }

  try {
    // ensure user exists
    const userQ = await pool.query("SELECT id, balance, currency FROM users WHERE id = $1", [acctId]);
    if (!userQ.rows.length) {
      console.warn(`❌ User not found: acctId=${acctId}`);
      const response = {
        serialNo,
        merchantCode: MERCHANT_CODE,
        acctId: String(acctId),
        balance: "0.000000000",
        code: 102, // use FastSpin's "user not found" code
        msg: "User not found",
      };
      console.log("📤 Responding (User not found):", JSON.stringify(response));
      return sendSigned(200, response);
    }

    let user = userQ.rows[0];
    let balance = parseFloat(user.balance || 0);
    const dbCurrency = user.currency || "USD";

    console.log(`👤 User found: id=${user.id}, balance=${balance}, currency=${dbCurrency}`);

    // CASE 1: Balance check
    if (isBalanceCheck) {
      const response = {
        serialNo,
        merchantCode: MERCHANT_CODE,
        acctInfo: {
          acctId: String(acctId),
          userName: `Player_${acctId}`,
          currency: dbCurrency,
          balance: balance.toFixed(9), // string with 9 decimals
        },
        code: 0,
        msg: "success",
      };
      console.log("📤 Responding (Balance Check):", JSON.stringify(response));
      return sendSigned(200, response);
    }

    // CASE 2: Transfer - validate required fields
    if (!transferId || !currency || amount === undefined || type === undefined) {
      console.error("❌ Missing required fields for transfer:", req.body);
      const response = {
        serialNo,
        merchantCode: MERCHANT_CODE,
        acctId: String(acctId),
        code: 400,
        msg: "Missing required fields for transfer",
      };
      console.log("📤 Responding (Bad request):", JSON.stringify(response));
      return sendSigned(400, response);
    }

    // ensure fs_transactions exists (idempotency storage)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS fs_transactions (
        id SERIAL PRIMARY KEY,
        transfer_id VARCHAR(100) UNIQUE,
        acct_id INT NOT NULL,
        type INT NOT NULL,
        amount NUMERIC NOT NULL,
        balance_after NUMERIC NOT NULL,
        game_code VARCHAR(50),
        reference_id VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // idempotency check BEFORE BEGIN
    const existing = await pool.query("SELECT * FROM fs_transactions WHERE transfer_id = $1", [transferId]);
    if (existing.rows.length) {
      console.warn(`⚠️ Duplicate transferId ${transferId}, returning existing result`);
      const existingBalance = parseFloat(existing.rows[0].balance_after || 0);
      const response = {
        serialNo,
        merchantCode: MERCHANT_CODE,
        acctId: String(acctId),
        balance: existingBalance.toFixed(9),
        code: 0,
        msg: "success (duplicate ignored)",
      };
      console.log("📤 Responding (Duplicate):", JSON.stringify(response));
      return sendSigned(200, response);
    }

    // process under transaction
    await pool.query("BEGIN");
    console.log(`⚙️ Processing transfer: type=${type}, amount=${amount}, acctId=${acctId}`);

    if (type === 1) {
      // DEBIT - place bet
      console.log("🎲 Place Bet request (DEBIT)");
      if (balance < amount) {
        console.warn(`⚠️ Insufficient funds: balance=${balance}, amount=${amount}`);
        await pool.query("ROLLBACK");
        const response = {
          serialNo,
          merchantCode: MERCHANT_CODE,
          acctId: String(acctId),
          balance: balance.toFixed(9),
          code: 101, // FastSpin Insufficient funds
          msg: "Insufficient funds",
        };
        console.log("📤 Responding (Insufficient funds):", JSON.stringify(response));
        return sendSigned(200, response);
      }
      balance = balance - amount;
      console.log(`✅ Debit applied: new balance=${balance}`);
    } else if ([2, 3, 4, 7].includes(type)) {
      // CREDIT - cancel, rollback, payout, bonus
      console.log(`💳 Credit request (type=${type})`);
      balance = balance + amount;
      console.log(`✅ Credit applied: new balance=${balance}`);
    } else {
      console.error("❌ Unknown transfer type:", type);
      await pool.query("ROLLBACK");
      const response = {
        serialNo,
        merchantCode: MERCHANT_CODE,
        acctId: String(acctId),
        code: 400,
        msg: "Unknown transfer type",
      };
      console.log("📤 Responding (Unknown type):", JSON.stringify(response));
      return sendSigned(400, response);
    }

    // update user balance
    await pool.query("UPDATE users SET balance = $1 WHERE id = $2", [balance, acctId]);
    console.log(`💾 Balance updated in DB: acctId=${acctId}, newBalance=${balance}`);

    // insert fs transaction record
    await pool.query(
      `INSERT INTO fs_transactions 
         (transfer_id, acct_id, type, amount, balance_after, game_code, reference_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [transferId, acctId, type, amount, balance, gameCode || null, referenceId || null]
    );

    await pool.query("COMMIT");

    // final response (strict format)
    const response = {
      serialNo,
      merchantCode: MERCHANT_CODE,
      acctId: String(acctId),
      balance: balance.toFixed(9), // string with 9 decimal places
      code: 0,
      msg: "success",
    };
    console.log("📤 Responding (Transfer):", JSON.stringify(response));
    return sendSigned(200, response);
  } catch (err) {
    console.error("❌ Wallet server error:");
    console.error("   Message:", err.message);
    console.error("   Stack:", err.stack);
    try {
      await pool.query("ROLLBACK");
    } catch (e) {
      console.error("❌ Rollback failed:", e);
    }
    const response = {
      serialNo: req.body.serialNo || uuidv4(),
      merchantCode: MERCHANT_CODE,
      code: 500,
      msg: "Wallet server error",
    };
    console.log("📤 Responding (Server error):", JSON.stringify(response));
    // sign response
    const respDigest = crypto.createHash("md5").update(JSON.stringify(response) + SECRET_KEY, "utf8").digest("hex");
    res.setHeader("Digest", respDigest);
    return res.status(500).json(response);
  }
});





// router.post("/wallet", async (req, res) => {
//   console.log("===============================================");
//   console.log("📩 Incoming Wallet Request at", new Date().toISOString());
//   console.log("Headers:", JSON.stringify(req.headers, null, 2));
//   console.log("Body:", JSON.stringify(req.body, null, 2));

//   const rawBody = req.rawBody || JSON.stringify(req.body);
//   const incomingDigest = req.headers["digest"];
//   const calcDigest = crypto
//     .createHash("md5")
//     .update(rawBody + SECRET_KEY, "utf8")
//     .digest("hex");

//   console.log("🔑 Incoming digest:", incomingDigest);
//   console.log("🧮 Calculated digest:", calcDigest);

//   if (incomingDigest !== calcDigest) {
//     console.error("❌ Digest mismatch!");
//     const response = {
//       serialNo: req.body.serialNo || uuidv4(),
//       merchantCode: MERCHANT_CODE,
//       code: 401,
//       msg: "Invalid digest",
//     };
//     console.log("📤 Responding (Digest error):", JSON.stringify(response));
//     return res.status(400).json(response);
//   }

//   const {
//     serialNo,
//     transferId,
//     acctId,
//     currency,
//     amount,
//     type,
//     gameCode,
//     referenceId,
//   } = req.body;

//  if (!transferId && type === undefined) {
//     console.log("👉 Detected BALANCE CHECK request");
//   } else {
//     console.log("👉 Detected TRANSFER request");
//     console.log(`   ➡️ type=${type}, transferId=${transferId}, amount=${amount}, gameCode=${gameCode}, referenceId=${referenceId}`);
//   }




//   try {
//     // ✅ Ensure user exists
//     const userQ = await pool.query(
//       "SELECT id, balance, currency FROM users WHERE id = $1",
//       [acctId]
//     );

//     if (!userQ.rows.length) {
//       console.warn(`❌ User not found: acctId=${acctId}`);
//       const response = {
//         serialNo,
//         merchantCode: MERCHANT_CODE,
//         acctId: String(acctId),
//         code: 404,
//         msg: "User not found",
//         balance: 0.000000000,
//       };
//       console.log("📤 Responding (User not found):", JSON.stringify(response));
//       return res.json(response);
//     }

//     let user = userQ.rows[0];
//     let balance = parseFloat(user.balance);
//     let dbCurrency = user.currency || "USD";

//     console.log(
//       `👤 User found: id=${user.id}, balance=${balance}, currency=${dbCurrency}`
//     );

//     // ✅ CASE 1: Balance check
//     if (!transferId && type === undefined) {
//       console.log("🔍 Detected Balance Check Request");
//       const response = {
//         serialNo,
//         merchantCode: MERCHANT_CODE,
//         acctInfo: {
//           acctId: String(acctId),
//           userName: `Player_${acctId}`,
//           currency: dbCurrency,
//           balance: Number(balance.toFixed(9)),
//         },
//         code: 0,
//         msg: "success",
//       };
//       console.log("📤 Responding (Balance Check):", JSON.stringify(response));
//       res.setHeader("Content-Type", "application/json; charset=UTF-8");
//       return res.json(response);
//     }

//     // ✅ CASE 2: Transfer
//     if (!transferId || !currency || amount === undefined || !type) {
//       console.error("❌ Missing required fields for transfer:", req.body);
//       const response = {
//         serialNo,
//         merchantCode: MERCHANT_CODE,
//         acctId: String(acctId),
//         code: 400,
//         msg: "Missing required fields for transfer",
//       };
//       console.log("📤 Responding (Bad request):", JSON.stringify(response));
//       return res.status(400).json(response);
//     }

//     // ✅ Idempotency check
//     const existing = await pool.query(
//       "SELECT * FROM transactions WHERE transfer_id = $1",
//       [transferId]
//     );

//     if (existing.rows.length) {
//       console.warn(`⚠️ Duplicate transferId ${transferId}, returning existing result`);
//       const response = {
//         serialNo,
//         merchantCode: MERCHANT_CODE,
//         acctId: String(acctId),
//         balance: Number(existing.rows[0].balance_after).toFixed(9),
//         code: 0,
//         msg: "success (duplicate ignored)",
//       };
//       console.log("📤 Responding (Duplicate):", JSON.stringify(response));
//       return res.json(response);
//     }

//     await pool.query("BEGIN");
//     console.log(
//       `⚙️ Processing transfer: type=${type}, amount=${amount}, acctId=${acctId}`
//     );

//     // ✅ Process transaction types
//     if (type === 1) {
//       console.log("🎲 Place Bet request (DEBIT)");
//       if (balance < amount) {
//         console.warn(`⚠️ Insufficient funds: balance=${balance}, amount=${amount}`);
//         await pool.query("ROLLBACK");
//         const response = {
//           serialNo,
//           merchantCode: MERCHANT_CODE,
//           acctId: String(acctId),
//           code: 402,
//           msg: "Insufficient funds",
//           balance: Number(balance.toFixed(9)),
//         };
//         console.log("📤 Responding (Insufficient funds):", JSON.stringify(response));
//         return res.json(response);
//       }
//       balance -= amount;
//     } else if (type === 2) {
//       console.log("↩️ Cancel Bet request (CREDIT)");
//       balance += amount;
//     } else if (type === 3) {
//       console.log("⏪ Rollback Bet request (CREDIT)");
//       balance += amount;
//     } else if (type === 4) {
//       console.log("💰 Payout request (CREDIT)");
//       balance += amount;
//     } else if (type === 7) {
//       console.log("🎁 Bonus credit request (CREDIT)");
//       balance += amount;
//     } else {
//       console.error("❌ Unknown transfer type:", type);
//       await pool.query("ROLLBACK");
//       const response = {
//         serialNo,
//         merchantCode: MERCHANT_CODE,
//         acctId: String(acctId),
//         code: 400,
//         msg: "Unknown transfer type",
//       };
//       console.log("📤 Responding (Unknown type):", JSON.stringify(response));
//       return res.status(400).json(response);
//     }

//     // ✅ Update user balance
//     await pool.query("UPDATE users SET balance = $1 WHERE id = $2", [
//       balance,
//       acctId,
//     ]);
//     console.log(`💾 Balance updated in DB: acctId=${acctId}, newBalance=${balance}`);

//     // ✅ Save transaction
//     const insertRes = await pool.query(
//       `INSERT INTO transactions 
//        (transfer_id, acct_id, type, amount, balance_after, game_code, reference_id)
//        VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
//       [transferId, acctId, type, amount, balance, gameCode || null, referenceId || null]
//     );

//     await pool.query("COMMIT");

//     const newTxId = insertRes.rows[0].id.toString();
//     console.log(
//       `✅ Transfer recorded: transferId=${transferId}, transactionId=${newTxId}, finalBalance=${balance}`
//     );

//     // ✅ Respond to FastSpin
//     const response = {
//       serialNo,
//       merchantCode: MERCHANT_CODE,
//       acctId: String(acctId),
//       balance: Number(balance.toFixed(9)),
//       code: 0,
//       msg: "success",
//     };

//     console.log("📤 Responding (Transfer):", JSON.stringify(response));
//     res.setHeader("Content-Type", "application/json; charset=UTF-8");
//     return res.json(response);
//   } catch (err) {
//     console.error("❌ Wallet server error:", err);
//     await pool.query("ROLLBACK").catch(() => {});
//     return res.status(500).json({ code: 500, msg: "Wallet server error" });
//   }
// });

















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

    const serialNo = Date.now().toString();
    const token = crypto.randomBytes(16).toString("hex");

    // Base payload
    const payload = {
      merchantCode: MERCHANT_CODE,
      acctInfo: {
        acctId: user.id.toString(),
        userName: user.username || user.full_name || `User${user.id}`,
        currency: user.currency,
        siteId: process.env.SITE_ID || MERCHANT_CODE, // ✅ safer default
      },
      language: "en_US",
      token,
      acctIp: req.ip?.replace("::1", "127.0.0.1") || "127.0.0.1",
      serialNo,
      mobile: "true",
      fun: "false", // ✅ force always real money mode
    };

    if (isLobby) {
      payload.lobby = "FS";
    } else {
      payload.game = gameCode;
      payload.menuMode = "true";
      payload.exitUrl = process.env.EXIT_URL || "https://yourdomain.com/exit"; // ✅ real domain
      payload.fullScreen = "true";
    }

    const digest = createDigest(payload, SECRET_KEY);

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
// router.post("/launch-game", authMiddleware, async (req, res) => {
//   try {
//     const user = req.user;
//     const { gameCode, isLobby } = req.body;

//     if (!user || !user.id || !user.currency) {
//       return res.status(400).json({ error: "Invalid user profile" });
//     }

//     // Step 1: Build authorize payload
//     const serialNo = Date.now().toString();
//     const token = crypto.randomBytes(16).toString("hex");

//     const payload = {
//       merchantCode: MERCHANT_CODE,
//       acctInfo: {
//         acctId: user.id.toString(),
//         userName: user.username || user.full_name || `User${user.id}`,
//         currency: user.currency,
//         siteId: process.env.SITE_ID || "SITE_DEFAULT",
//         balance: user.balance || 0, // FS updates via wallet APIs
//       },
//       language: "en_US",
//       token,
//       acctIp: req.ip?.replace("::1", "127.0.0.1") || "127.0.0.1",
//       serialNo,
//       mobile: "true",
//     };

//     if (isLobby) {
//       payload.lobby = "FS";
//     } else {
//       payload.game = gameCode;
//       payload.fun = "false";
//       payload.menuMode = "true";
//       payload.exitUrl = "http://www.domain.example.com";
//       payload.fullScreen = "true";
//     }

//     // Step 2: Digest header
//     const digest = createDigest(payload, SECRET_KEY);

//     // Step 3: Call FastSpin
//     const fsResponse = await axios.post(`${FASTSPIN_URL}/getAuthorize`, payload, {
//       headers: {
//         "Content-Type": "application/json",
//         "API": "authorize",
//         "DataType": "JSON",
//         "Digest": digest,
//       },
//     });

//     console.log("🎯 FastSpin getAuthorize Response:", fsResponse.data);

//     if (fsResponse.data.code === 0) {
//       return res.json({
//         url: fsResponse.data.gameUrl,
//         token: fsResponse.data.token,
//         serialNo: fsResponse.data.serialNo,
//       });
//     } else {
//       return res.status(400).json({ error: fsResponse.data.msg });
//     }
//   } catch (err) {
//     console.error("❌ Launch Game Error:", err.response?.data || err.message);
//     return res.status(500).json({ error: "Game launch failed" });
//   }
// });


//pagmatic play code goes here





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
