require('dotenv').config();
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const { chromium } = require('playwright');

// Scrapers
const scrapeMMTFlights = require('./scrapers/mmtFlights');
const scrapeMMTHotels = require('./scrapers/mmtHotels');
const scrapeGoibiboFlights = require('./scrapers/goibiboFlights');
const scrapeGoibiboHotels = require('./scrapers/goibiboHotels');
const scrapeYatraFlights = require('./scrapers/yatraFlights');
const scrapeYatraHotels = require('./scrapers/yatraHotels');

const RESULTS_FILE = path.join(__dirname, 'results', 'latest.json');

function parseDateEnv(name, fallback) {
  const v = process.env[name];
  if (!v) return fallback;
  const d = new Date(v);
  if (isNaN(d.getTime())) return fallback;
  return v;
}

function getSearchParams() {
  return {
    flights: {
      fromCode: process.env.FLIGHT_FROM || 'DEL',
      toCode: process.env.FLIGHT_TO || 'BOM',
      departDate: parseDateEnv('FLIGHT_DEPART_DATE', '2025-09-01')
    },
    hotels: {
      location: process.env.HOTEL_LOCATION || 'Mumbai',
      checkinDate: parseDateEnv('HOTEL_CHECKIN', '2025-09-01'),
      checkoutDate: parseDateEnv('HOTEL_CHECKOUT', '2025-09-03')
    }
  };
}

async function run() {
  const headless = process.env.HEADLESS !== 'false';
  const runInParallel = process.env.RUN_IN_PARALLEL !== 'false';
  const searchParams = getSearchParams();

  console.log(chalk.cyan(`[runner] Launching Chromium (headless=${headless})`));
  const browser = await chromium.launch({ headless });

  try {
    const tasks = [
      () => scrapeMMTFlights(browser, searchParams.flights),
      () => scrapeMMTHotels(browser, searchParams.hotels),
      () => scrapeGoibiboFlights(browser, searchParams.flights),
      () => scrapeGoibiboHotels(browser, searchParams.hotels),
      () => scrapeYatraFlights(browser, searchParams.flights),
      () => scrapeYatraHotels(browser, searchParams.hotels)
    ];

    let results = [];

    if (runInParallel) {
      console.log(chalk.cyan('[runner] Running scrapers in parallel'));
      const outputs = await Promise.all(tasks.map(t => t().catch(err => {
        console.log(chalk.red(`[runner] Task failed: ${err.message}`));
        return [];
      })));
      results = outputs.flat();
    } else {
      console.log(chalk.cyan('[runner] Running scrapers sequentially'));
      for (const t of tasks) {
        try {
          const out = await t();
          results.push(...out);
        } catch (err) {
          console.log(chalk.red(`[runner] Task failed: ${err.message}`));
        }
      }
    }

    // Ensure results directory exists
    const resultsDir = path.dirname(RESULTS_FILE);
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2), 'utf-8');
    console.log(chalk.green(`[runner] Wrote ${results.length} records to ${RESULTS_FILE}`));
  } catch (err) {
    console.log(chalk.red(`[runner] Fatal error: ${err.stack || err.message}`));
  } finally {
    await browser.close();
  }
}

run();