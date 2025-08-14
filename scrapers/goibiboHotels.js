const chalk = require('chalk');
const { ensureCookiesAndMaybeManualLogin, isoDateToAriaSubstring, waitForResults, parsePriceToNumber } = require('./shared');

module.exports = async function scrapeGoibiboHotels(browser, params) {
  const portal = 'Goibibo';
  const type = 'hotel';
  const baseUrl = 'https://www.goibibo.com';
  const url = `${baseUrl}/hotels/`;

  const context = await browser.newContext();
  const page = await context.newPage();
  await ensureCookiesAndMaybeManualLogin(context, portal, baseUrl);

  const results = [];

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    await page.click("input[placeholder='Search city, area or property']");
    await page.fill("input[placeholder='Search city, area or property']", params.location, { timeout: 10000 });
    await page.keyboard.press('Enter');

    const checkinSub = isoDateToAriaSubstring(params.checkinDate);
    const checkoutSub = isoDateToAriaSubstring(params.checkoutDate);
    await page.click(`.DayPicker-Day[aria-label*='${checkinSub}']`, { timeout: 10000 }).catch(() => {});
    await page.click(`.DayPicker-Day[aria-label*='${checkoutSub}']`, { timeout: 10000 }).catch(() => {});

    await page.click('button:has-text("Search")').catch(() => {});

    await waitForResults(page, '.HotelCardstyles__HotelNameWrapperDiv', 45000);

    const cards = await page.$$('.HotelCardstyles__HotelNameWrapperDiv');
    const now = new Date().toISOString();

    for (const c of cards) {
      const name = (await c.evaluate(el => el.textContent.trim()).catch(() => null)) || null;
      // Price may be located near name; using given selector
      const priceText = (await page.$eval('.HotelCardstyles__PriceWrapperDiv', el => el.textContent.trim()).catch(() => null)) || null;
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