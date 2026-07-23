const app = require('./app');
const env = require('./config/env');
const pool = require('./config/db');

async function startServer() {
  try {
    await pool.query('SELECT 1');
    console.log('Connected to MySQL');

    app.listen(env.port, () => {
      console.log(`MediBook API running on http://localhost:${env.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();
