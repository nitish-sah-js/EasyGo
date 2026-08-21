import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1400 } });
await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await page.waitForTimeout(1500); // let journey-loader fade out
await page.screenshot({ path: "/private/tmp/claude-501/-Users-baldev-Desktop-EasyGo-Easy/66e923b7-8fd8-4cc2-a096-4aa517e0093b/scratchpad/landing-full.png", fullPage: true });
await page.screenshot({ path: "/private/tmp/claude-501/-Users-baldev-Desktop-EasyGo-Easy/66e923b7-8fd8-4cc2-a096-4aa517e0093b/scratchpad/landing-hero.png" });
await browser.close();
console.log("done");
