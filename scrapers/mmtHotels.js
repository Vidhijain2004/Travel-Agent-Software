const chalk = require('chalk');
const { ensureCookiesAndMaybeManualLogin, isoDateToAriaSubstring, waitForResults, parsePriceToNumber } = require('./shared');

module.exports = async function scrapeMMTHotels(browser, params) {
  const portal = 'MMT';
  const type = 'hotel';
  const baseUrl = 'https://www.makemytrip.com';
  const url = `${baseUrl}/hotels/`;

  const context = await browser.newContext();
  const page = await context.newPage();
  await ensureCookiesAndMaybeManualLogin(context, portal, baseUrl);

  const results = [];

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // Location
    await page.click("input[placeholder='Enter city/Hotel/Area']");
    await page.fill("input[placeholder='Enter city/Hotel/Area']", params.location, { timeout: 10000 });
    await page.keyboard.press('Enter');

    // Dates
    const checkinSub = isoDateToAriaSubstring(params.checkinDate);
    const checkoutSub = isoDateToAriaSubstring(params.checkoutDate);
    await page.click("label[for='checkin']").catch(() => {});
    await page.click(`.DayPicker-Day[aria-label*='${checkinSub}']`, { timeout: 10000 }).catch(() => {});
    await page.click(`.DayPicker-Day[aria-label*='${checkoutSub}']`, { timeout: 10000 }).catch(() => {});

    // Search
    await page.click('button.primaryBtn');

    await waitForResults(page, '.hotelCardListing', 45000);

    const cards = await page.$$('.hotelCardListing');
    const now = new Date().toISOString();

    for (const c of cards) {
      const name = (await c.$eval('.listingHotelDescription .hotelName', el => el.textContent.trim()).catch(() => null)) || null;
      const priceText = (await c.$eval('.actualPriceText', el => el.textContent.trim()).catch(() => null)) || null;
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