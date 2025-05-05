const Redis = require("ioredis");

// Redis connection configuration
const redisClient = new Redis({
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: process.env.REDIS_PORT || 6379,
    retryStrategy: (times) => Math.min(times * 50, 2000), // Retry logic
});

// Error handling
redisClient.on("error", (err) => {
    console.error("🚨 Redis Error:", err);
});

redisClient.on("connect", () => {
    console.log("✅ Connected to Redis");
});

module.exports = redisClient;
