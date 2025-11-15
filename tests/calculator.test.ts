import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Calculator } from "../src/calculator.js";
import fs from "fs";
import path from "path";

describe("Calculator", () => {
  const calculator = new Calculator();
  let testLogs: string[] = [];
  const logsDir = "./allure-results/logs";

  beforeEach(() => {
    testLogs = [];
    // ログディレクトリ作成
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  });

  afterEach(({ task }) => {
    // テスト終了後にログをファイルに保存
    if (testLogs.length > 0) {
      const testName = task.name.toLowerCase().replace(/[^a-z0-9]/g, "_");
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const logFileName = `${testName}_${timestamp}.log`;
      const logFilePath = path.join(logsDir, logFileName);

      const logContent = testLogs.join("\n");
      fs.writeFileSync(logFilePath, logContent);
      console.log(`📋 Log saved: ${logFileName}`);
    }
  });

  function log(message: string) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    testLogs.push(logMessage);
    console.log(logMessage);
  }

  describe("add", () => {
    it("should add two positive numbers", () => {
      log("テスト開始: 正の数の足し算");
      log("入力値: a=2, b=3");

      const result = calculator.add(2, 3);
      log(`実行結果: ${result}`);

      expect(result).toBe(5);
      log("検証成功: 2 + 3 = 5");
      log("テスト完了");
    });

    it("should add negative numbers", () => {
      log("テスト開始: 負の数の足し算");
      log("入力値: a=-2, b=-3");

      const result = calculator.add(-2, -3);
      log(`実行結果: ${result}`);

      expect(result).toBe(-5);
      log("検証成功: -2 + (-3) = -5");
      log("テスト完了");
    });

    it("should add zero", () => {
      log("テスト開始: ゼロの足し算");
      log("入力値: a=5, b=0");

      const result = calculator.add(5, 0);
      log(`実行結果: ${result}`);

      expect(result).toBe(5);
      log("検証成功: 5 + 0 = 5");
      log("テスト完了");
    });
  });

  describe("subtract", () => {
    it("should subtract two numbers", () => {
      log("テスト開始: 引き算");
      log("入力値: a=5, b=3");

      const result = calculator.subtract(5, 3);
      log(`実行結果: ${result}`);

      expect(result).toBe(2);
      log("検証成功: 5 - 3 = 2");
      log("テスト完了");
    });

    it("should handle negative results", () => {
      log("テスト開始: 負の結果の引き算");
      log("入力値: a=3, b=5");

      const result = calculator.subtract(3, 5);
      log(`実行結果: ${result}`);

      expect(result).toBe(-2);
      log("検証成功: 3 - 5 = -2");
      log("テスト完了");
    });
  });

  describe("multiply", () => {
    it("should multiply two numbers", () => {
      log("テスト開始: 掛け算");
      log("入力値: a=3, b=4");

      const result = calculator.multiply(3, 4);
      log(`実行結果: ${result}`);

      expect(result).toBe(12);
      log("検証成功: 3 × 4 = 12");
      log("テスト完了");
    });

    it("should multiply by zero", () => {
      log("テスト開始: ゼロとの掛け算");
      log("入力値: a=5, b=0");

      const result = calculator.multiply(5, 0);
      log(`実行結果: ${result}`);

      expect(result).toBe(0);
      log("検証成功: 5 × 0 = 0");
      log("テスト完了");
    });
  });

  describe("divide", () => {
    it("should divide two numbers", () => {
      log("テスト開始: 割り算");
      log("入力値: a=10, b=2");

      const result = calculator.divide(10, 2);
      log(`実行結果: ${result}`);

      expect(result).toBe(5);
      log("検証成功: 10 ÷ 2 = 5");
      log("テスト完了");
    });

    it("should throw error when dividing by zero", () => {
      log("テスト開始: ゼロ除算のエラーテスト");
      log("入力値: a=10, b=0");

      try {
        calculator.divide(10, 0);
        log("エラー: 例外が発生しませんでした");
      } catch (error) {
        log(`例外発生: ${(error as Error).message}`);
      }

      expect(() => calculator.divide(10, 0)).toThrow("Division by zero");
      log("検証成功: 正しく例外が発生");
      log("テスト完了");
    });
  });
});
