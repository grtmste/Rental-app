require('dotenv').config();
const app = require('./app');
const init = require('./init');

const PORT = process.env.PORT || 3001;

function checkSmtpConfig() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('⚠️  HOIATUS: SMTP seadistus puudub. E-kirjade saatmine ei tööta.');
  } else {
    console.log(`✅ SMTP seadistatud: ${process.env.SMTP_USER}`);
  }
}

async function start() {
  await init();
  checkSmtpConfig();
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

start();
