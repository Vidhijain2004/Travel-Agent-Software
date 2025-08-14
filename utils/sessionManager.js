const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const SESSIONS_DIR = path.join(__dirname, '..', 'sessions');

function ensureSessionsDir() {
  if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  }
}

function getCookieFilePath(portalName) {
  ensureSessionsDir();
  return path.join(SESSIONS_DIR, `${portalName}.cookies.json`);
}

async function loadCookies(browserContext, portalName) {
  try {
    const filePath = getCookieFilePath(portalName);
    if (fs.existsSync(filePath)) {
      const cookiesRaw = fs.readFileSync(filePath, 'utf-8');
      const cookies = JSON.parse(cookiesRaw);
      if (Array.isArray(cookies) && cookies.length > 0) {
        await browserContext.addCookies(cookies);
        console.log(chalk.green(`[session] Loaded cookies for ${portalName}`));
      } else {
        console.log(chalk.yellow(`[session] Cookie file for ${portalName} is empty; proceeding without cookies.`));
      }
    } else {
      console.log(chalk.yellow(`[session] No cookie file found for ${portalName}; first-time login may be required.`));
    }
  } catch (err) {
    console.log(chalk.red(`[session] Failed to load cookies for ${portalName}: ${err.message}`));
  }
}

async function saveCookies(browserContext, portalName) {
  try {
    const filePath = getCookieFilePath(portalName);
    const cookies = await browserContext.cookies();
    fs.writeFileSync(filePath, JSON.stringify(cookies, null, 2), 'utf-8');
    console.log(chalk.green(`[session] Saved cookies for ${portalName} -> ${filePath}`));
  } catch (err) {
    console.log(chalk.red(`[session] Failed to save cookies for ${portalName}: ${err.message}`));
  }
}

module.exports = {
  loadCookies,
  saveCookies
};