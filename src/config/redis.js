const Redis = require('ioredis');
const env = require('./env');

const redis = new Redis({
  host: env.redis.host,
  port: env.redis.port,
  maxRetriesPerRequest: null,
});

redis.on('error', (error) => {
  console.error('Redis error:', error.message);
});

module.exports = redis;
