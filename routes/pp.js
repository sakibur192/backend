const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const router = express.Router();

// Pragmatic Play API credentials
const API_URL = "https://api.prerelease-env.biz/IntegrationService/v3/http/CasinoGameAPI/getCasinoGames/";
const SECURE_LOGIN = "tlbt_itelbet"; 
const OPERATOR_SECRET = "hmednN6zovHK7KuE";

/**
 * Generate MD5 hash for authentication
 * hash = md5(secureLogin + OPERATOR_SECRET)
 */
function generateHash() {
    return crypto.createHash("md5").update(SECURE_LOGIN + OPERATOR_SECRET).digest("hex");
}

/**
 * GET Casino Games
 * POST /api/pp/getCasinoGames
 */
router.post("/getCasinoGames", async (req, res) => {
    try {
        const hash = generateHash();

        // Prepare POST body
        const params = new URLSearchParams({
            secureLogin: SECURE_LOGIN,
            hash: hash,
            options: "GetFeatures,GetFrbDetails,GetLines,GetDataTypes,GetFcDetails,GetStudio"
        });

        // Send POST request to Pragmatic Play
        const response = await axios.post(API_URL, params.toString(), {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            timeout: 15000 // 15 sec timeout
        });

        const data = response.data;

        if (data.error === "0") {
            // ✅ Successfully retrieved games
            console.log(`Retrieved ${data.gameList.length} games`);
            res.json({
                error: 0,
                description: "Success",
                games: data.gameList
            });
        } else {
            // ❌ Error from PP API
            console.error("Pragmatic Play API error:", data.description);
            res.status(400).json({ error: data.error, description: data.description });
        }

    } catch (error) {
        console.error("Request failed:", error.message);
        res.status(500).json({ error: 500, description: "Failed to fetch games", details: error.message });
    }
});

module.exports = router;
