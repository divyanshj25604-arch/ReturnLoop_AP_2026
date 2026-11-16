const dotenv = require('dotenv');

dotenv.config({ quiet: true });

const env = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
};

module.exports = env;
