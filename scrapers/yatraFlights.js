const chalk = require('chalk');
const { ensureCookiesAndMaybeManualLogin, waitForResults, parsePriceToNumber } = require('./shared');

module.exports = async function scrapeYatraFlights(browser, params) {
  const portal = 'Yatra';
  const type = 'flight';
  const baseUrl = 'https://www.yatra.com';
  const url = `${baseUrl}/flights`;

  const context = await browser.newContext();
  const page = await context.newPage();
  await ensureCookiesAndMaybeManualLogin(context, portal, baseUrl);

  const results = [];

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    await page.click('#BE_flight_origin_city');
    await page.fill('#BE_flight_origin_city', params.fromCode);
    await page.keyboard.press('Enter');

    await page.click('#BE_flight_arrival_city');
    await page.fill('#BE_flight_arrival_city', params.toCode);
    await page.keyboard.press('Enter');

    await page.click('#BE_flight_flsearch_btn');

    await waitForResults(page, '.flightItem', 45000);

    const cards = await page.$$('.flightItem');
    const now = new Date().toISOString();

    for (const c of cards) {
      const name = (await c.$eval('.flightName', el => el.textContent.trim()).catch(() => null)) || null;
      const priceText = (await c.$eval('.fare-summary .price', el => el.textContent.trim()).catch(() => null)) || null;
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