const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const crypto = require("crypto");
const cors = require("cors");

const app = express();
const PORT = 3000;
app.use(cors());

// === CONFIGURATION ===
const FASTSPIN_URL = "https://api-egame-staging.fsuat.com/api";
const MERCHANT_CODE = "CASINO1";
const SECRET_KEY = "CASINO1ctegbeajLq4Wbeaj";

// === MIDDLEWARE ===
app.use(bodyParser.json());

// === UTILS ===
function generateDigest(payload) {
  const json = JSON.stringify(payload);
  const digest = crypto.createHash("md5").update(json + SECRET_KEY, "utf8").digest("hex");
  console.log("🔑 Digest Input:", json + SECRET_KEY);
  console.log("🔐 Digest:", digest);
  return digest;
}

// === ROUTES ===

// Health check
app.get("/health", (req, res) => {
  res.send("FastSpin API server is running.");
});

// GET /games - Fetch all games
app.get("/games", async (req, res) => {
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

  console.log("📦 Payload:", payload);
  console.log("📨 Headers:", headers);

  try {
    const response = await axios.post(FASTSPIN_URL, payload, { headers });

    console.log("✅ Response:", response.status);
    console.log("📥 Body:", response.data);

    res.json(response.data);
  } catch (error) {
    console.error("❌ Error:");
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Headers:", error.response.headers);
      console.error("Data:", error.response.data);
      res.status(error.response.status).json(error.response.data);
    } else if (error.request) {
      console.error("No response from FastSpin:", error.request);
      res.status(504).json({ error: "No response from FastSpin server" });
    } else {
      console.error("Unexpected error:", error.message);
      res.status(500).json({ error: "Unexpected Error" });
    }
  }
});

app.post("/get-authorized", async (req, res) => {
  console.log("🚀 Incoming /get-authorized request body:", req.body);

  const {
    acctId,
    gameCode,
    lang,
    currency,
    serialNo,
    userName
  } = req.body;

  const merchantCode = MERCHANT_CODE; // ✅ Set internally
  const acctIp = "223.25.253.139";     // ✅ Required field

  // Validation
  const missingFields = [];
  if (!acctId) missingFields.push("acctId");
  if (!gameCode) missingFields.push("gameCode");
  if (!lang) missingFields.push("lang");
  if (!currency) missingFields.push("currency");
  if (!serialNo) missingFields.push("serialNo");
  if (!userName) missingFields.push("userName");

  if (missingFields.length) {
    return res.status(400).json({ error: `Missing fields: ${missingFields.join(", ")}` });
  }

  const payload = {
    merchantCode,
    acctInfo: {
      acctId,
      userName,
      currency,
      balance: 10000,             // 💰 optional, adjust as needed
      siteId: "SITE_BDT"          // 🔁 match your FastSpin config
    },
    language: lang,
    token: "test-token",
    game: gameCode,
    acctIp,                       // ✅ key is acctIp (NOT ClientIp)
    fun: "false",
    mobile: "true",
    menuMode: "true",
    exitUrl: "http://yourdomain.com",
    fullScreen: "true",
    serialNo
  };

  const headers = {
    API: "getAuthorize",
    DataType: "JSON",
    Digest: generateDigest(payload),
    "Content-Type": "application/json"
  };

  console.log("📦 Payload to FastSpin:", payload);
  console.log("🧾 Headers:", headers);

  try {
    const response = await axios.post(`${FASTSPIN_URL}/forward`, payload, { headers });

    console.log("✅ FastSpin getAuthorize response:", response.data);

  if (response.data.code === 0 && (response.data.launchUrl || response.data.gameUrl)) {
  const url = response.data.launchUrl || response.data.gameUrl;
  res.json({ launchUrl: url, msg: response.data.msg });
} else {
  res.status(400).json({
    error: response.data.msg || "FastSpin did not return a valid URL",
    debug: response.data
  });
}




  } catch (err) {
    console.error("❌ Error from FastSpin getAuthorize:");
    if (err.response) {
      res.status(err.response.status).json({
        error: err.response.data?.msg || "FastSpin API error",
        debug: err.response.data
      });
    } else {
      res.status(500).json({ error: "Internal Server Error", debug: err.message });
    }
  }
});








// app.post("/get-authorized", async (req, res) => {
//   console.log("🚀 Incoming /get-authorized request body:", req.body);

//   const {
//     acctId,
//     gameCode,
//     lang,
//     currency,
//     serialNo,
//     userName
//   } = req.body;

//   const merchantCode = MERCHANT_CODE; // from config
//   const ClientIp = "223.25.253.139"; // required, case-sensitive!

//   // Basic validation
//   const missingFields = [];
//   if (!acctId) missingFields.push("acctId");
//   if (!gameCode) missingFields.push("gameCode");
//   if (!lang) missingFields.push("lang");
//   if (!currency) missingFields.push("currency");
//   if (!serialNo) missingFields.push("serialNo");
//   if (!userName) missingFields.push("userName");

//   if (missingFields.length) {
//     return res.status(400).json({ error: `Missing fields: ${missingFields.join(", ")}` });
//   }

//   const payload = {
//     acctId,
//     gameCode,
//     lang,
//     merchantCode,
//     currency,
//     serialNo,
//     userName,
//     token: "test-token",
//     ClientIp
//   };

//   const headers = {
//     API: "getAuthorize",
//     DataType: "JSON",
//     Digest: generateDigest(payload),
//     "Content-Type": "application/json"
//   };

//   console.log("📦 Payload to FastSpin:", payload);
//   console.log("🧾 Headers:", headers);

//   try {
//     const response = await axios.post(`${FASTSPIN_URL}/forward`, payload, { headers });

//     console.log("✅ FastSpin getAuthorize response:", response.data);

//     if (response.data.code === 0 && response.data.launchUrl) {
//       res.json({ launchUrl: response.data.launchUrl }); // success
//     } else {
//       res.status(400).json({
//         error: response.data.msg || "FastSpin did not return a launchUrl",
//         debug: response.data
//       });
//     }
//   } catch (err) {
//     console.error("❌ Error from FastSpin getAuthorize:");
//     if (err.response) {
//       console.error("📉 Status:", err.response.status);
//       console.error("📥 Data:", err.response.data);
//       res.status(err.response.status).json({
//         error: err.response.data?.msg || "FastSpin API error",
//         debug: err.response.data
//       });
//     } else {
//       res.status(500).json({ error: "Internal Server Error", debug: err.message });
//     }
//   }
// });




// // POST /launch-game - Launch selected game
// app.post("/launch-game", async (req, res) => {
//   console.log("🚀 Incoming /launch-game request body:", req.body);

//   const {
//     acctId,
//     gameCode,
//     lang,
//     merchantCode,
//     currency,
//     serialNo,
//     userName
//   } = req.body;

//   // Validate required fields
//   const missingFields = [];
//   if (!acctId) missingFields.push("acctId");
//   if (!gameCode) missingFields.push("gameCode");
//   if (!lang) missingFields.push("lang");
//   if (!merchantCode) missingFields.push("merchantCode");
//   if (!currency) missingFields.push("currency");
//   if (!serialNo) missingFields.push("serialNo");
//   if (!userName) missingFields.push("userName");

//   if (missingFields.length) {
//     console.warn("⚠️ Missing required fields:", missingFields);
//     return res.status(400).json({ error: `Missing fields: ${missingFields.join(", ")}` });
//   }

//   const payload = {
//     acctId,
//     gameCode,
//     lang,
//     merchantCode,
//     currency,
//     serialNo,
//     userName,
//     token: "test-token",
//     clientIp: "223.25.253.139"  // ✅ Capitalized exactly as required
//   };
// const digest = generateDigest(payload);
//  const headers = {
//   API: "getAuthorize",
//   DataType: "JSON",
//   Digest: digest,
//   "Content-Type": "application/json"
// };
//   console.log("📦 Payload being sent to FastSpin:", payload);
//   console.log("🧾 Headers being used:", headers);

//   try {
//     const response = await axios.post(FASTSPIN_URL + "/forward", payload, { headers });

//     console.log("✅ FastSpin response:", response.data);

//     if (response.data.code === 0 && response.data.launchUrl) {
//       res.json({ gameUrl: response.data.launchUrl });
//     } else {
//       res.status(400).json({
//         error: response.data.msg || "FastSpin responded without launchUrl",
//         debug: response.data
//       });
//     }
//   } catch (error) {
//     console.error("❌ Error from FastSpin API:");
//     if (error.response) {
//       console.error("📉 Status:", error.response.status);
//       console.error("📥 Data:", error.response.data);
//       res.status(error.response.status).json({
//         error: error.response.data?.msg || "FastSpin API error",
//         debug: error.response.data
//       });
//     } else {
//       console.error("🛑 Unknown error:", error.message);
//       res.status(500).json({ error: "Internal Server Error", debug: error.message });
//     }
//   }
// });

// === START SERVER ===
app.listen(PORT, () => {
  console.log(`🚀 FastSpin API server running at http://localhost:${PORT}`);
});
