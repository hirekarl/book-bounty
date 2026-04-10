/**
 * BookBounty live demo script.
 *
 * Records a 1600×900 browser session to demo/videos/*.webm.
 * The script is idempotent — it wipes the demo account via the REST API
 * before launching the browser, so it can be re-run cleanly.
 *
 * Setup:
 *   cp .env.example .env   # fill in credentials
 *   npm install
 *   npx playwright install chromium
 *   npm run demo
 *
 * Output:
 *   demo/videos/<uuid>.webm
 *   Convert to mp4: ffmpeg -i videos/<uuid>.webm -c:v libx264 output.mp4
 */

import { chromium } from 'playwright';
import 'dotenv/config';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const API_URL = process.env.API_URL || 'http://localhost:8000';
const DEMO_USERNAME = process.env.DEMO_USERNAME || 'demo';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'demo';

// ── Demo content ─────────────────────────────────────────────────────────────

const ISBN = '039309040X'; // The Marx-Engels Reader, 2nd Ed.

const GOAL_NAME = 'The Patriot Cleanse';
const GOAL_DESC =
  "Purge all ideological contraband from the premises. If it cites Marx approvingly " +
  "or appeared on a university syllabus without apology, it leaves. The shelves should " +
  "reflect the values of this household \u2014 not the values of someone who uses the " +
  "word \u2018dialectical\u2019 unironically.";

const BOOK_NOTE =
  "Found shelved behind the respectable books. Remove immediately. This volume has no " +
  "place in a household where liberty is used without quotation marks.";

// ── API helpers (run before browser opens) ───────────────────────────────────

async function apiLogin() {
  const res = await fetch(`${API_URL}/api/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: DEMO_USERNAME, password: DEMO_PASSWORD }),
  });
  if (!res.ok) throw new Error(`API login failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.key;
}

async function teardown(token) {
  const headers = { Authorization: `Token ${token}` };

  // Delete all catalog entries (paginated)
  let page = 1;
  while (true) {
    const res = await fetch(`${API_URL}/api/entries/?page_size=200&page=${page}`, { headers });
    const data = await res.json();
    const entries = data.results ?? [];
    for (const entry of entries) {
      await fetch(`${API_URL}/api/entries/${entry.id}/`, { method: 'DELETE', headers });
    }
    if (!data.next) break;
    page++;
  }

  // Delete all culling goals
  const goalsRes = await fetch(`${API_URL}/api/goals/`, { headers });
  const goals = await goalsRes.json();
  for (const goal of goals) {
    await fetch(`${API_URL}/api/goals/${goal.id}/`, { method: 'DELETE', headers });
  }

  console.log('  Account cleaned.');
}

// ── Scroll helper ─────────────────────────────────────────────────────────────
//
// Runs an eased rAF animation loop inside the page and returns a Promise that
// only resolves when the animation is complete.  page.evaluate() awaits it,
// so the next line in the script never runs until the scroll finishes — no
// more guessing at waitForTimeout durations after a scroll call.

async function scrollTo(page, targetY, durationMs = 1100) {
  await page.evaluate(
    ({ targetY, durationMs }) =>
      new Promise((resolve) => {
        const startY = window.scrollY;
        const distance = targetY - startY;
        if (distance === 0) return resolve();
        const startTime = performance.now();

        const ease = (t) =>
          t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; // easeInOutCubic

        const step = (now) => {
          const progress = Math.min((now - startTime) / durationMs, 1);
          window.scrollTo(0, startY + distance * ease(progress));
          progress < 1 ? requestAnimationFrame(step) : resolve();
        };

        requestAnimationFrame(step);
      }),
    { targetY, durationMs },
  );
}

async function scrollBy(page, deltaY, durationMs = 1100) {
  const currentY = await page.evaluate(() => window.scrollY);
  await scrollTo(page, currentY + deltaY, durationMs);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  // Step 0: Idempotent account reset
  console.log('[setup] Logging in for teardown...');
  const token = await apiLogin();
  await teardown(token);

  // Launch headed browser with video recording
  const browser = await chromium.launch({ headless: false });

  const context = await browser.newContext({
    viewport: { width: 1600, height: 900 },
    recordVideo: {
      dir: './videos/',
      size: { width: 1600, height: 900 },
    },
  });

  const page = await context.newPage();

  try {
    // ── Scene 1: Landing page ─────────────────────────────────────────────
    console.log('[scene 1] Landing page');

    await page.goto(`${BASE_URL}/welcome`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2500);

    // Slow scroll — reveal the value props
    await scrollTo(page, 550, 1400);
    await page.waitForTimeout(600);
    await scrollTo(page, 1300, 1400);
    await page.waitForTimeout(600);
    await scrollTo(page, 0, 1200);
    await page.waitForTimeout(800);

    // Click "Sign In" in the navbar (first of two Sign In buttons)
    await page.getByRole('button', { name: 'Sign In' }).first().click();

    // ── Scene 2: Login ────────────────────────────────────────────────────
    console.log('[scene 2] Login');

    await page.waitForURL('**/login');
    await page.waitForTimeout(800);

    // No name/id on these inputs — locate by type
    const usernameInput = page.locator('input[type="text"]');
    const passwordInput = page.locator('input[type="password"]');

    await usernameInput.click();
    await page.waitForTimeout(300);
    await usernameInput.pressSequentially(DEMO_USERNAME, { delay: 60 });
    await page.waitForTimeout(400);

    await passwordInput.click();
    await page.waitForTimeout(300);
    await passwordInput.pressSequentially(DEMO_PASSWORD, { delay: 60 });
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL(`${BASE_URL}/`);
    await page.waitForTimeout(1500);

    // ── Scene 3: Create Culling Goal ──────────────────────────────────────
    console.log('[scene 3] Creating culling goal');

    // Account is clean — "Create Your First Goal" button is visible
    await page.getByRole('button', { name: 'Create Your First Goal' }).click();
    await page.waitForTimeout(600);

    // Goal name (human typing pace)
    const nameInput = page.getByPlaceholder('e.g. Minimalist Move');
    await nameInput.click();
    await nameInput.pressSequentially(GOAL_NAME, { delay: 40 });
    await page.waitForTimeout(400);

    // Goal description (faster — long text)
    const descInput = page.getByPlaceholder(/Describe your goal/i);
    await descInput.click();
    await descInput.pressSequentially(GOAL_DESC, { delay: 12 });
    await page.waitForTimeout(600);

    await page.getByRole('button', { name: 'Create & Activate' }).click();

    // Wait for the goal name to appear in the active-goal card
    await page.waitForSelector(`text=${GOAL_NAME}`);
    await page.waitForTimeout(2000);

    // ── Scene 4: Triage Wizard ────────────────────────────────────────────
    console.log('[scene 4] Triage Wizard');

    await page.getByRole('link', { name: /scan books/i }).click();
    await page.waitForURL('**/scan');
    await page.waitForTimeout(1200);

    // Enter ISBN manually (camera off by default — skip camera toggle)
    const isbnInput = page.getByPlaceholder('Enter ISBN...');
    await isbnInput.click();
    await page.waitForTimeout(300);
    await isbnInput.pressSequentially(ISBN, { delay: 80 });
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: 'Lookup' }).click();

    // Wait for step 2 to render
    await page.waitForSelector('text=Step 2 of 3');
    await page.waitForTimeout(1000);

    // Wait for AI rec + valuation to load (spinner text disappears)
    console.log('[scene 4] Waiting for AI recommendation + valuation...');
    await page.waitForSelector('text=Analyzing book...', { state: 'hidden', timeout: 45000 });
    await page.waitForTimeout(2500); // Dramatic pause on the recommendation card

    // Scroll down to the Condition & Details / Notes section
    await scrollBy(page, 700, 1000);

    // Type the note
    const notesField = page.locator('#triage-notes');
    await notesField.click();
    await notesField.pressSequentially(BOOK_NOTE, { delay: 22 });
    await page.waitForTimeout(600);

    // Scroll back to the top of step 2 to show the Accept button
    await scrollTo(page, 0, 1000);

    // Accept the AI recommendation
    await page.getByRole('button', { name: /Accept/i }).click();
    await page.waitForTimeout(700);

    // Scroll down to the Save button
    const pageHeight = await page.evaluate(() => document.body.scrollHeight);
    await scrollTo(page, pageHeight, 1000);

    await page.getByRole('button', { name: 'Save & Scan Next' }).click();

    // Step 3 — success screen
    await page.waitForSelector('text=Saved!');
    await page.waitForTimeout(2500);

    // ── Scene 5: Collection ───────────────────────────────────────────────
    console.log('[scene 5] Collection');

    await page.getByRole('button', { name: 'Collection' }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3500); // Pause on the newly cataloged entry

    console.log('[done] Demo complete.');
  } finally {
    // Closing the context finalizes the video file
    await context.close();
    const videoPath = await page.video()?.path();
    await browser.close();
    console.log(`\nVideo saved: ${videoPath ?? 'check demo/videos/'}`);
    console.log('Convert to mp4: ffmpeg -i <file>.webm -c:v libx264 output.mp4');
  }
}

run().catch((err) => {
  console.error('Demo failed:', err);
  process.exit(1);
});
