const dotenv = require('dotenv');

dotenv.config({ quiet: true });

const env = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL,
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  },
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || process.env.DB_DATABASE || 'returnloop_db',
    user: process.env.DB_USER || process.env.USER,
    password: process.env.DB_PASSWORD,
  },
};

module.exports = env;
