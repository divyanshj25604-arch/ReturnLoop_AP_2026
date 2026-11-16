require('dotenv').config();

const express = require('express');

const app = express();

module.exports = app;

// Temporary entry point until a dedicated server module is added.
if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Return Loop listening on port ${port}`);
  });
}
