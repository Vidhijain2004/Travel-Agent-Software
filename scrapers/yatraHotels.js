const chalk = require('chalk');
const { ensureCookiesAndMaybeManualLogin, isoDateToAriaSubstring, waitForResults, parsePriceToNumber } = require('./shared');

module.exports = async function scrapeYatraHotels(browser, params) {
  const portal = 'Yatra';
  const type = 'hotel';
  const baseUrl = 'https://www.yatra.com';
  const url = `${baseUrl}/hotels`;

  const context = await browser.newContext();
  const page = await context.newPage();
  await ensureCookiesAndMaybeManualLogin(context, portal, baseUrl);

  const results = [];

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    await page.click('#BE_hotel_destination_city');
    await page.fill('#BE_hotel_destination_city', params.location);
    await page.keyboard.press('Enter');

    const checkinSub = isoDateToAriaSubstring(params.checkinDate);
    const checkoutSub = isoDateToAriaSubstring(params.checkoutDate);
    await page.click(`.DayPicker-Day[aria-label*='${checkinSub}']`, { timeout: 10000 }).catch(() => {});
    await page.click(`.DayPicker-Day[aria-label*='${checkoutSub}']`, { timeout: 10000 }).catch(() => {});

    await page.click('button:has-text("Search")').catch(() => {});

    await waitForResults(page, '.hotelCard', 45000);

    const cards = await page.$$('.hotelCard');
    const now = new Date().toISOString();

    for (const c of cards) {
      const name = (await c.$eval('.hotelName', el => el.textContent.trim()).catch(() => null)) || null;
      const priceText = (await c.$eval('.price', el => el.textContent.trim()).catch(() => null)) || null;
      const price = parsePriceToNumber(priceText);
      const link = (await c.$eval('a', el => el.href).catch(() => null)) || page.url();

      if (name && price) {
        results.push({ portal, type, name, price, currency: 'INR', link, timestamp: now });
      }
    }

    console.log(chalk.green(`[${portal}][${type}] Collected ${results.length} results`));
  } catch (err) {
    console.log(chalk.red(`[${portal}][${type}] Error: ${err.message}`));
  } finally {
    await context.close();
  }

  return results;
};