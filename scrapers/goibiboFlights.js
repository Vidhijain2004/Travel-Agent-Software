const chalk = require('chalk');
const { ensureCookiesAndMaybeManualLogin, isoDateToAriaSubstring, typeAndSelectFromList, waitForResults, parsePriceToNumber } = require('./shared');

module.exports = async function scrapeGoibiboFlights(browser, params) {
  const portal = 'Goibibo';
  const type = 'flight';
  const baseUrl = 'https://www.goibibo.com';
  const url = `${baseUrl}/flights/`;

  const context = await browser.newContext();
  const page = await context.newPage();
  await ensureCookiesAndMaybeManualLogin(context, portal, baseUrl);

  const results = [];

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // From
    await typeAndSelectFromList(
      page,
      "input[placeholder='From']",
      params.fromCode,
      `li[data-id='${params.fromCode}']`
    );

    // To
    await typeAndSelectFromList(
      page,
      "input[placeholder='To']",
      params.toCode,
      `li[data-id='${params.toCode}']`
    );

    // Departure date
    const dateSub = isoDateToAriaSubstring(params.departDate);
    await page.click(`.DayPicker-Day[aria-label*='${dateSub}']`, { timeout: 10000 }).catch(() => {});

    // Assuming a general search button on Goibibo flights page
    await page.click('button:has-text("Search")').catch(() => {});

    await waitForResults(page, '.sr_card', 45000);

    const cards = await page.$$('.sr_card');
    const now = new Date().toISOString();

    for (const c of cards) {
      const name = (await c.$eval('.airlineName', el => el.textContent.trim()).catch(() => null)) || null;
      const priceText = (await c.$eval('.actual-price', el => el.textContent.trim()).catch(() => null)) || null;
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