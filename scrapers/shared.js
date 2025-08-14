const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { loadCookies, saveCookies } = require('../utils/sessionManager');

function parsePriceToNumber(text) {
  if (!text) return null;
  const digits = String(text).replace(/[^0-9]/g, '');
  if (!digits) return null;
  return Number(digits);
}

function isoDateToAriaSubstring(dateIso) {
  // Use the provided YYYY-MM-DD as a generic substring for aria-label contains
  return dateIso;
}

async function ensureCookiesAndMaybeManualLogin(scrapeContext, portalName, loginUrl) {
  const sessionsDir = path.join(__dirname, '..', 'sessions');
  const cookiePath = path.join(sessionsDir, `${portalName}.cookies.json`);

  await loadCookies(scrapeContext, portalName);

  if (fs.existsSync(cookiePath)) {
    return;
  }

  const isHeadlessEnv = process.env.HEADLESS !== 'false';
  if (isHeadlessEnv) {
    console.log(chalk.yellow(`[session] No cookies for ${portalName}. Running headless; skipping manual login and proceeding without cookies.`));
    return;
  }

  console.log(chalk.yellow(`[session] No cookies for ${portalName}. Opening manual login window...`));
  const headfulBrowser = await chromium.launch({ headless: false });
  const headfulContext = await headfulBrowser.newContext();
  const page = await headfulContext.newPage();

  await page.goto(loginUrl, { waitUntil: 'domcontentloaded' });
  console.log(chalk.yellow(`Please log in to ${portalName} in the opened window.`));
  console.log(chalk.yellow('Press Enter here when login is complete, or wait 120s timeout...'));

  await waitForEnterOrTimeout(120000);

  await saveCookies(headfulContext, portalName);
  await headfulBrowser.close();

  // Reload cookies into scraping context
  await loadCookies(scrapeContext, portalName);
}

function waitForEnterOrTimeout(timeoutMs) {
  return new Promise(resolve => {
    const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      rl.close();
      resolve();
    }, timeoutMs);

    rl.on('line', () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      rl.close();
      resolve();
    });
  });
}

async function clickIfVisible(page, selector, timeout = 3000) {
  try {
    const el = await page.waitForSelector(selector, { timeout });
    if (el) await el.click({ delay: 50 });
  } catch {}
}

async function typeAndSelectFromList(page, inputSelector, value, itemSelector) {
  await page.click(inputSelector, { delay: 50 });
  await page.fill(inputSelector, '');
  await page.type(inputSelector, value, { delay: 50 });
  try {
    await page.waitForSelector(itemSelector, { timeout: 7000 });
    await page.click(itemSelector, { delay: 50 });
  } catch (e) {
    // fallback enter
    await page.keyboard.press('Enter');
  }
}

async function waitForResults(page, selector, timeout = 30000) {
  await page.waitForLoadState('domcontentloaded');
  try {
    await page.waitForSelector(selector, { timeout });
  } catch {}
}

module.exports = {
  parsePriceToNumber,
  isoDateToAriaSubstring,
  ensureCookiesAndMaybeManualLogin,
  clickIfVisible,
  typeAndSelectFromList,
  waitForResults
};