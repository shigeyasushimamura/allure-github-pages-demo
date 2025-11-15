import fs from "fs";
import path from "path";

const testResults = JSON.parse(fs.readFileSync("./test-results.json", "utf8"));
const allureResultsDir = "./allure-results";
const logsDir = path.join(allureResultsDir, "logs");

// allure-resultsディレクトリを作成
if (!fs.existsSync(allureResultsDir)) {
  fs.mkdirSync(allureResultsDir, { recursive: true });
}

// ログファイルを取得
function getLogsForTest(testName) {
  if (!fs.existsSync(logsDir)) {
    return [];
  }

  const files = fs.readdirSync(logsDir);
  const testNameNormalized = testName.toLowerCase().replace(/[^a-z0-9]/g, "_");

  return files
    .filter(
      (file) => file.includes(testNameNormalized) && file.endsWith(".log")
    )
    .sort()
    .map((file) => ({
      filename: file,
      path: path.join(logsDir, file),
    }));
}

// テスト結果をAllure形式に変換
testResults.testResults.forEach((testFile, fileIndex) => {
  testFile.assertionResults.forEach((test, testIndex) => {
    const uuid = `${Date.now()}-${fileIndex}-${testIndex}`;
    const testNameNormalized = test.title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_");

    // ログファイルを取得
    const logs = getLogsForTest(testNameNormalized);

    // Allure形式のattachmentsを作成（ログファイル）
    const attachments = logs.map((log) => ({
      name: `📋 実行ログ`,
      source: log.filename,
      type: "text/plain",
    }));

    const result = {
      uuid: uuid,
      historyId: test.fullName,
      fullName: test.fullName,
      labels: [
        { name: "suite", value: testFile.name },
        { name: "package", value: path.dirname(testFile.name) },
        { name: "testClass", value: test.ancestorTitles[0] || "Unknown" },
        { name: "testMethod", value: test.title },
      ],
      links: [],
      name: test.title,
      status: test.status === "passed" ? "passed" : "failed",
      stage: "finished",
      steps: [],
      attachments: attachments,
      parameters: [],
      start: testFile.startTime || Date.now(),
      stop: testFile.endTime || Date.now(),
    };

    if (test.failureMessages && test.failureMessages.length > 0) {
      result.statusDetails = {
        message: test.failureMessages.join("\n"),
        trace: test.failureMessages.join("\n"),
      };
    }

    fs.writeFileSync(
      path.join(allureResultsDir, `${uuid}-result.json`),
      JSON.stringify(result, null, 2)
    );
  });
});

console.log("✅ Converted test results to Allure format");
const logCount = fs.existsSync(logsDir) ? fs.readdirSync(logsDir).length : 0;
if (logCount > 0) {
  console.log(`📋 Attached ${logCount} log files`);
}
