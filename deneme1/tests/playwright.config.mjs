// Playwright end-to-end config for Harbor Jelly.
//   npm i -D @playwright/test          (no browser download needed: it uses your installed Chrome)
//   npx playwright test -c deneme1/tests/playwright.config.mjs
//   (if npx picks up another Playwright copy and says "did not expect test() to be called here", run
//    node node_modules/@playwright/test/cli.js test -c deneme1/tests/playwright.config.mjs)
// Headless Chrome has no GPU, so WebGPU runs on SwiftShader (slow but complete). Set HJ_URL to test a
// page that is already being served; otherwise the repo root is served on :8746.
import { defineConfig } from "@playwright/test";

const url = process.env.HJ_URL || "http://127.0.0.1:8746/deneme1/";
export default defineConfig({
  testDir: ".",
  testMatch: "e2e.spec.mjs",
  timeout: 240_000,
  expect: { timeout: 60_000 },
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: url,
    channel: "chrome",
    headless: true,
    viewport: { width: 1280, height: 800 },
    launchOptions: { args: ["--enable-unsafe-webgpu", "--enable-features=WebGPUService", "--use-webgpu-adapter=swiftshader", "--enable-unsafe-swiftshader"] },
  },
  webServer: process.env.HJ_URL ? undefined : { command: "python -m http.server 8746 --bind 127.0.0.1", cwd: "../..", url, reuseExistingServer: true },
});
