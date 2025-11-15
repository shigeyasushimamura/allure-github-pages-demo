import { describe, it, expect, beforeAll, afterAll } from "vitest";
import puppeteer, { Browser, Page } from "puppeteer";
import fs from "fs";
import path from "path";

describe("Calculator UI E2E Tests", () => {
  let browser: Browser | undefined;

  let page: Page;
  const screenshotsDir = "./allure-results/screenshots";

  beforeAll(async () => {
    // スクリーンショット保存用ディレクトリ作成
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  // スクリーンショット撮影用のヘルパー関数
  async function takeScreenshot(testName: string, stepName: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `${testName}_${stepName}_${timestamp}.png`;
    const filepath = path.join(screenshotsDir, filename) as `${string}.png`;

    await page.screenshot({ path: filepath, fullPage: true });
    console.log(`📸 Screenshot saved: ${filename}`);

    return filepath;
  }

  it("正常系：足し算の計算", async () => {
    const testName = "addition";

    // ステップ1: ページを開く
    const htmlPath = path.resolve(__dirname, "../fixtures/calculator.html");
    await page.goto(`file://${htmlPath}`);
    await takeScreenshot(testName, "01_初期画面");

    // ステップ2: 最初の数値を入力
    await page.type("#num1", "5");
    await takeScreenshot(testName, "02_数値1入力");

    // ステップ3: 2番目の数値を入力
    await page.type("#num2", "3");
    await takeScreenshot(testName, "03_数値2入力");

    // ステップ4: 足し算ボタンをクリック
    await page.click("#add-button");
    await page.waitForSelector("#result", { timeout: 5000 });
    await takeScreenshot(testName, "04_計算結果");

    // 検証
    const result = await page.$eval("#result", (el) => el.textContent);
    expect(result).toBe("8");
  });

  it("正常系：引き算の計算", async () => {
    const testName = "subtraction";

    const htmlPath = path.resolve(__dirname, "../fixtures/calculator.html");
    await page.goto(`file://${htmlPath}`);
    await takeScreenshot(testName, "01_初期画面");

    await page.type("#num1", "10");
    await takeScreenshot(testName, "02_数値1入力");

    await page.type("#num2", "4");
    await takeScreenshot(testName, "03_数値2入力");

    await page.click("#subtract-button");
    await page.waitForSelector("#result", { timeout: 5000 });
    await takeScreenshot(testName, "04_計算結果");

    const result = await page.$eval("#result", (el) => el.textContent);
    expect(result).toBe("6");
  });

  it("異常系：ゼロ除算のエラー表示", async () => {
    const testName = "division_by_zero";

    const htmlPath = path.resolve(__dirname, "../fixtures/calculator.html");
    await page.goto(`file://${htmlPath}`);
    await takeScreenshot(testName, "01_初期画面");

    await page.type("#num1", "10");
    await page.type("#num2", "0");
    await takeScreenshot(testName, "02_ゼロ入力");

    await page.click("#divide-button");
    await page.waitForSelector(".error-message", { timeout: 5000 });
    await takeScreenshot(testName, "03_エラー表示");

    const errorMessage = await page.$eval(
      ".error-message",
      (el) => el.textContent
    );
    expect(errorMessage).toContain("ゼロで割ることはできません");
  });
});
