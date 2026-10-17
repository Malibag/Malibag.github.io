// Harbor Jelly end-to-end test (Playwright). See playwright.config.mjs for how to run it.
import { test, expect } from "@playwright/test";

async function open(page, url) {
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(url);
  await page.waitForFunction(() => window.__harbor && (window.__harbor.ready || window.__harbor.fallback), null, { timeout: 90_000 });
  return errors;
}
const frames = (page) => page.evaluate(() => window.__harbor.frames);
async function waitFrames(page, n) { const f0 = await frames(page); await page.waitForFunction((f) => window.__harbor.frames >= f, f0 + n, { timeout: 90_000 }); }
const project = (page, p) => page.evaluate((q) => window.__harbor.project(q), p);

test("renders the jelly harbour with WebGPU, no console errors, no page scroll", async ({ page, baseURL }) => {
  const errors = await open(page, baseURL);
  await expect(page.locator("#pillText")).toHaveText("WebGPU · Live");
  await expect(page.locator("h1")).toHaveText("Harbor Jelly.");
  await expect(page.locator(".eyebrow").first()).toHaveText(/material studies/i);
  await waitFrames(page, 3);
  const counts = await page.evaluate(() => window.__harbor.counts());
  expect(counts.containers).toBeGreaterThan(250);
  expect(counts.fish).toBeGreaterThanOrEqual(100);
  expect(counts.gulls).toBeGreaterThanOrEqual(10);
  expect(counts.jellies).toBeGreaterThanOrEqual(5);
  const png = await page.locator("#view").screenshot();
  expect(png.length).toBeGreaterThan(80_000); // a busy picture, not a blank canvas
  const scroll = await page.evaluate(() => [document.documentElement.scrollHeight - innerHeight, document.documentElement.scrollWidth - innerWidth]);
  expect(scroll).toEqual([0, 0]);
  expect(errors).toEqual([]);
});

test("controls: horn (button and Space), feed, flavours, sliders, pause, sound, reset view", async ({ page, baseURL }) => {
  const errors = await open(page, baseURL);
  await page.click("#hornBtn");
  await page.locator("#view").focus();
  await page.keyboard.press("Space");
  expect((await page.evaluate(() => window.__harbor.stats())).horns).toBe(2);
  await page.click("#feedBtn");
  await expect(page.locator("#tFed")).toHaveText("1");
  expect((await page.evaluate(() => window.__harbor.counts())).pellets).toBeGreaterThan(10);
  await page.click("[data-flavour=blueberry]");
  await expect(page.locator("[data-flavour=blueberry]")).toHaveAttribute("aria-checked", "true");
  await expect(page.locator("[data-flavour=seaglass]")).toHaveAttribute("aria-checked", "false");
  expect((await page.evaluate(() => window.__harbor.stats())).flavour).toBe("blueberry");
  await page.locator("#tide").fill("7");
  await expect(page.locator("#tideOut")).toHaveText("+7 cm");
  await page.locator("#firm").fill("80");
  await expect(page.locator("#firmOut")).toHaveText("80%");
  await page.click("#pauseBtn");
  await expect(page.locator("#pauseBtn")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#pillText")).toHaveText("WebGPU · Paused");
  await page.click("#pauseBtn");
  await page.click("#soundBtn");
  await expect(page.locator("#soundBtn")).toHaveText("Sound off");
  await page.click("#viewBtn");
  expect(errors).toEqual([]);
});

test("pointer: waves on the water, tipping the block, throwing a lifebuoy, orbit and zoom", async ({ page, baseURL }) => {
  const errors = await open(page, baseURL);
  await waitFrames(page, 2);
  const a = await project(page, [-0.9, 0, 1.3]), b = await project(page, [0.3, 0, 1.5]);
  expect(await page.evaluate(([x, y]) => window.__harbor.pick(x, y), a)).toBe("water");
  await page.mouse.move(a[0], a[1]); await page.mouse.down();
  for (let k = 1; k <= 10; k++) await page.mouse.move(a[0] + ((b[0] - a[0]) * k) / 10, a[1] + ((b[1] - a[1]) * k) / 10);
  await page.mouse.up();
  expect(await page.evaluate(() => Math.max(...Array.from(window.__harbor.sim.eta).map(Math.abs)))).toBeGreaterThan(0.005);
  const s = await project(page, [0.6, -0.75, 2.6]);
  expect(await page.evaluate(([x, y]) => window.__harbor.pick(x, y), s)).toBe("side");
  await page.mouse.move(s[0], s[1]); await page.mouse.down();
  for (let k = 1; k <= 8; k++) await page.mouse.move(s[0], s[1] + k * 18);
  await waitFrames(page, 2);
  expect((await page.evaluate(() => window.__harbor.stats())).block.ax).toBeGreaterThan(0.03);
  await page.mouse.up();
  expect((await page.evaluate(() => window.__harbor.stats())).block.tax).toBe(0);
  const lb = await page.evaluate(() => window.__harbor.lifebuoys()[0]);
  const l = await project(page, lb);
  expect(await page.evaluate(([x, y]) => window.__harbor.pick(x, y), l)).toBe("buoy");
  await page.mouse.move(l[0], l[1]); await page.mouse.down();
  for (let k = 1; k <= 6; k++) await page.mouse.move(l[0] - k * 25, l[1] + k * 8);
  await page.mouse.up();
  await waitFrames(page, 2);
  const lb2 = await page.evaluate(() => window.__harbor.lifebuoys()[0]);
  expect(Math.hypot(lb2[0] - lb[0], lb2[2] - lb[2])).toBeGreaterThan(0.2);
  const cam0 = (await page.evaluate(() => window.__harbor.stats())).cam;
  await page.mouse.move(40, 300); await page.mouse.down(); await page.mouse.move(140, 300, { steps: 5 }); await page.mouse.up();
  await page.mouse.wheel(0, 400);
  const cam1 = (await page.evaluate(() => window.__harbor.stats())).cam;
  expect(cam1.yaw).not.toBeCloseTo(cam0.yaw, 2);
  expect(cam1.dist).toBeGreaterThan(cam0.dist);
  expect(errors).toEqual([]);
});

test("Cast off sends the ship early; at sea the button becomes Call her in", async ({ page, baseURL }) => {
  const errors = await open(page, baseURL);
  await expect(page.locator("#castBtn")).toHaveText("Cast off");
  await page.click("#castBtn");
  await expect(page.locator("#castBtn")).toBeDisabled();
  for (let i = 0; i < 12; i++) {
    const s = await page.evaluate(() => window.__harbor.advance(5));
    if (s.startsWith("At sea")) break;
  }
  await expect(page.locator("#status")).toHaveText(/At sea \d+%/);
  await expect(page.locator("#castBtn")).toHaveText("Call her in");
  await expect(page.locator("#castBtn")).toBeEnabled();
  await page.click("#castBtn");
  await expect(page.locator("#castBtn")).toBeDisabled();
  expect(await page.evaluate(() => window.__harbor.harbor.hurry)).toBeGreaterThan(1);
  expect(errors).toEqual([]);
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test("controls live in a collapsible bottom sheet", async ({ page, baseURL }) => {
    const errors = await open(page, baseURL);
    const handle = page.locator("#sheetHandle");
    await expect(handle).toBeVisible();
    await expect(handle).toHaveAttribute("aria-expanded", "false");
    await handle.click();
    await expect(handle).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("#panel")).toHaveClass(/open/);
    const scroll = await page.evaluate(() => [document.documentElement.scrollHeight - innerHeight, document.documentElement.scrollWidth - innerWidth]);
    expect(scroll).toEqual([0, 0]);
    expect(errors).toEqual([]);
  });
});

test("friendly fallback when WebGPU is missing", async ({ browser, baseURL }) => {
  const context = await browser.newContext();
  await context.addInitScript(() => { Object.defineProperty(Navigator.prototype, "gpu", { get: () => undefined, configurable: true }); });
  const page = await context.newPage();
  const errors = await open(page, baseURL);
  await expect(page.locator("#fallback")).toBeVisible();
  await expect(page.locator("#fallback h2")).toHaveText("This study needs WebGPU.");
  await expect(page.locator("#pillText")).toHaveText("WebGPU · Off");
  await expect(page.locator("#view")).toBeHidden();
  expect(errors).toEqual([]);
  await context.close();
});

test("respects prefers-reduced-motion", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  const errors = await open(page, baseURL);
  await waitFrames(page, 2);
  expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
  await expect(page.locator("#pillText")).toHaveText("WebGPU · Live");
  expect(errors).toEqual([]);
  await context.close();
});
