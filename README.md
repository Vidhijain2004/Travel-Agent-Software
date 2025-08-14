## Travel Scraper (Playwright)

Scrapes flight and hotel search results from MakeMyTrip (MMT), Goibibo, and Yatra using Playwright.

- Session cookies are saved per portal after first manual login and reused later
- Results are written to `./results/latest.json`
- Single command run: `npm install && node masterRunner.js`

### Tech Stack
- Node.js (LTS)
- Playwright (Chromium)
- dotenv
- fs, path
- chalk

### Project Structure
```
/scrapers/
  mmtFlights.js
  mmtHotels.js
  goibiboFlights.js
  goibiboHotels.js
  yatraFlights.js
  yatraHotels.js
/utils/
  sessionManager.js
/results/
  latest.json
/sessions/
masterRunner.js
package.json
.env.example
README.md
```

### Setup
1. Clone/download this project
2. Copy `.env.example` to `.env` and adjust search params (optional)
3. Install dependencies and Playwright browser:
   - `npm install`

### First-time login (sessions)
- On first run, for each portal the script checks for a cookie file in `./sessions/<PORTAL>.cookies.json`.
- If missing, it will open the site and prompt you in the terminal to log in manually.
- Press Enter in the terminal when your login is complete (or wait for the timeout). Cookies will be saved for future runs.
- Subsequent runs reuse cookies and skip login.

Tips:
- For the very first run, you may set `HEADLESS=false` in `.env` to see the browser windows.
- If `HEADLESS=true` and cookies are missing, the script will temporarily open a visible browser just for login.

### Usage
- Default run:
  - `node masterRunner.js`
- With custom env:
  - Edit `.env` or export vars before running

### Output format
Each result is an object like:
```json
{
  "portal": "MMT | Goibibo | Yatra",
  "type": "flight | hotel",
  "name": "string",
  "price": 12345,
  "currency": "INR",
  "link": "string",
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

### Notes
- Real travel sites update their DOM frequently. Selectors here are best-effort using the provided hints and may need tweaks.
- Scraping respect: add delays if needed; do not overload the sites.
- This is for educational/testing use.
