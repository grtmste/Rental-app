const app = require('../backend/src/app');
const init = require('../backend/src/init');

// Cached per cold start — safe because init() is idempotent
let initPromise = null;

module.exports = async (req, res) => {
  if (!initPromise) {
    initPromise = init().catch(err => {
      console.error('Init failed:', err.message);
      initPromise = null; // allow retry on next request
    });
  }
  await initPromise;
  return app(req, res);
};
