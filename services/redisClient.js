const redis = require('redis');
require('dotenv').config();

const client = redis.createClient({
  url: process.env.REDIS_URL,
});

client.on('error', (err) => {
  console.error('❌ Redis connection error:', err);
});

client.connect()
  .then(() => console.log('✅ Redis connected'))
  .catch((err) => console.error('❌ Redis failed to connect:', err));

module.exports = client;
