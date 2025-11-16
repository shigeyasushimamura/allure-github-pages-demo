import fs from "fs";
import path from "path";
import type { ITestLogger } from "./IReporter.js";

/**
 * テスト実行時のログ収集・ファイル出力
 */
export class TestLogger implements ITestLogger {
  private logs: string[] = [];

  constructor(private outputDir: string) {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  }

  log(message: string): void {
    // ISOString->ISO8681形式(日付と時刻の表現の国際標準規格)
    // フォーマット: yyyy-mm-ddthh:mm:ss.sssZ
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    this.logs.push(logMessage);
    console.log(logMessage);
  }

  save(testName: string): void {
    if (this.logs.length === 0) return;

    const sanitizedName = testName.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `${sanitizedName}_${timestamp}.txt`;
    const filePath = path.join(this.outputDir, fileName);

    const content = this.logs.join("\n");
    fs.writeFileSync(filePath, content);
    console.log(`📋 Log saved: ${fileName}`);
  }

  clear(): void {
    this.logs = [];
  }
}
