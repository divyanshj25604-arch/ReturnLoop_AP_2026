const app = require('./app');
const env = require('./config/env');
const db = require('./config/db');

function handleStartupError(err) {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${env.port} is already in use. Set a different PORT in .env.`);
  } else if (err.code === 'EACCES') {
    console.error(`Port ${env.port} requires elevated privileges.`);
  } else {
    console.error('Failed to start server:', err);
  }
  process.exit(1);
}

// Express 5 passes startup errors (e.g. EADDRINUSE) to the listen callback.
app.listen(env.port, (err) => {
  if (err) {
    handleStartupError(err);
    return;
  }

  console.log(
    `Return Loop API running on http://localhost:${env.port} (${env.nodeEnv})`
  );

  db.query('SELECT 1')
    .then(() => {
      console.log('Connected to PostgreSQL database');
    })
    .catch((dbErr) => {
      console.warn('Warning: Could not connect to PostgreSQL database:', dbErr.message);
    });
});
