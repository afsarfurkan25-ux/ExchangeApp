import express from "express"
import axios from "axios"
import cors from "cors"
import dotenv from "dotenv"
import rateLimit from "express-rate-limit"
import axiosRetry from "axios-retry"

dotenv.config()

const app = express()
const allowedOrigins = ['http://localhost:5173', 'https://kurmatik.net'];

app.use(cors({
    origin: function (origin, callback) {
        // origin yoksa (Electron masaüstü uygulaması file:// protokolü) veya beyaz listedeyse izin ver
        if (!origin || allowedOrigins.includes(origin) || origin.startsWith('file://')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(express.json())

// API İstek Limitör (DDoS/Spam Koruması)
const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 dakika
    max: 100, // her IP için en fazla 100 istek
    message: { error: "Çok fazla istek gönderildi, lütfen biraz bekleyip tekrar deneyin." },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// API Yeniden Deneme Mekanizması (Geçici kopmaları önler)
axiosRetry(axios, {
    retries: 3,
    retryDelay: (retryCount) => {
        return retryCount * 1000;
    },
    retryCondition: (error) => {
        return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.code === 'ECONNABORTED';
    }
});

// Döviz endpoint
app.get("/api/currency", async (req, res) => {
    try {
        const response = await axios.get(
            "https://open.er-api.com/v6/latest/TRY"
        )
        res.json(response.data)
    } catch (error) {
        console.error("Currency API Error:", error.message)
        res.status(500).json({ error: "Döviz verileri alınamadı", details: error.response?.data || error.message })
    }
})

const tryGoldApi = async (symbol) => {
    try {
        const response = await axios.get(
            `https://www.goldapi.io/api/${symbol}/TRY`,
            { headers: { "x-access-token": process.env.GOLD_API_KEY }, timeout: 8000 }
        )
        if (!response.data.error) return { ...response.data, currency: 'TRY' };
    } catch (e) {
        console.log(`${symbol}/TRY failed, trying ${symbol}/USD...`, e.message);
        try {
            const response = await axios.get(
                `https://www.goldapi.io/api/${symbol}/USD`,
                { headers: { "x-access-token": process.env.GOLD_API_KEY }, timeout: 8000 }
            )
            if (!response.data.error) return { ...response.data, currency: 'USD' };
        } catch (e2) {
            console.log(`${symbol}/USD also failed:`, e2.message);
        }
    }
    return null;
}

// Altın endpoint
app.get("/api/gold", async (req, res) => {
    try {
        const goldApiData = await tryGoldApi("XAU");
        if (goldApiData) return res.json(goldApiData);

        // Fallback: Use free finans.truncgil.com API
        console.log("GoldAPI failed, using finans.truncgil.com fallback...");
        const response = await axios.get(
            "https://finans.truncgil.com/v4/today.json",
            { headers: { "User-Agent": "Mozilla/5.0" }, timeout: 10000 }
        )
        const data = response.data
        const hasGramSelling = parseFloat(data.HAS?.Selling || 0)
        // Convert gram price to ounce: 1 troy ounce = 31.1034768 grams
        const ouncePriceTRY = hasGramSelling * 31.1034768
        res.json({ price: ouncePriceTRY, currency: 'TRY', source: 'truncgil' })
    } catch (error) {
        console.error("Gold API Error:", error.message)
        res.status(500).json({ error: "Altın verileri alınamadı", details: error.response?.data || error.message })
    }
})

// Silver endpoint
app.get("/api/silver", async (req, res) => {
    try {
        const silverApiData = await tryGoldApi("XAG");
        if (silverApiData) return res.json(silverApiData);

        // Fallback: Use free finans.truncgil.com API for silver
        console.log("GoldAPI silver failed, using finans.truncgil.com fallback...");
        const response = await axios.get(
            "https://finans.truncgil.com/v4/today.json",
            { headers: { "User-Agent": "Mozilla/5.0" }, timeout: 10000 }
        )
        const data = response.data
        // truncgil may have silver data: "GUMUS" key
        const silverSelling = parseFloat(data["GMŞ-ONS"]?.Selling || data["GUMUS"]?.Selling || 0)
        if (silverSelling > 0) {
            // If it's per-gram in TRY, convert to ounce
            const ouncePriceTRY = silverSelling * 31.1034768
            res.json({ price: ouncePriceTRY, currency: 'TRY', source: 'truncgil' })
        } else {
            // Return a reasonable estimate: silver is roughly 1/80th of gold price
            const hasGramSelling = parseFloat(data.HAS?.Selling || 0)
            const silverGram = hasGramSelling / 80
            const ouncePriceTRY = silverGram * 31.1034768
            res.json({ price: ouncePriceTRY, currency: 'TRY', source: 'truncgil-estimated' })
        }
    } catch (error) {
        console.error("Silver API Error:", error.message)
        res.status(500).json({ error: "Gümüş verileri alınamadı", details: error.response?.data || error.message })
    }
})

// Live Rates endpoint (HAS, ONS, USD from finans.truncgil.com)
app.get("/api/live-rates", async (req, res) => {
    try {
        const response = await axios.get(
            "https://finans.truncgil.com/v4/today.json",
            {
                headers: { "User-Agent": "Mozilla/5.0" },
                timeout: 10000
            }
        )
        const data = response.data

        let hasVal = data.HAS?.Selling || 0
        let hasChange = data.HAS?.Change || 0
        let onsVal = data.ONS?.Selling || 0
        let onsChange = data.ONS?.Change || 0
        const usdVal = data.USD?.Selling || 0

        // Fallback: Calculate ONS if API returns 0
        if ((!onsVal || onsVal == 0) && hasVal && usdVal) {
            onsVal = (parseFloat(hasVal) * 31.1035) / parseFloat(usdVal)
            onsChange = 0
        }

        res.json({
            has: parseFloat(hasVal).toFixed(2),
            hasChange: hasChange.toString(),
            ons: parseFloat(onsVal).toFixed(2),
            onsChange: onsChange.toString(),
            usd: parseFloat(usdVal).toFixed(2),
            updateDate: data.Update_Date || new Date().toISOString()
        })
    } catch (error) {
        console.error("Live Rates API Error:", error.message)
        res.status(500).json({ error: "Canlı kurlar alınamadı", details: error.response?.data || error.message })
    }
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
    console.log(`Server running on ${PORT}`)
})
