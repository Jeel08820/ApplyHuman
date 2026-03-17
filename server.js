'use strict';

const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');
const apiRouter = require('./routes/api');

const app = express();

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', apiLimiter, apiRouter);

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`ApplyHuman server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
