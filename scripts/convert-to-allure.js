import fs from "fs";
import path from "path";

const testResults = JSON.parse(fs.readFileSync("./test-results.json", "utf8"));
const allureResultsDir = "./allure-results";

// allure-resultsディレクトリを作成
if (!fs.existsSync(allureResultsDir)) {
  fs.mkdirSync(allureResultsDir, { recursive: true });
}

// ログファイルを取得（allure-results直下）
function getLogsForTest(testName) {
  if (!fs.existsSync(allureResultsDir)) {
    return [];
  }

  const files = fs.readdirSync(allureResultsDir);
  const testNameNormalized = testName.toLowerCase().replace(/[^a-z0-9]/g, "_");

  return files
    .filter(
      (file) => file.includes(testNameNormalized) && file.endsWith(".txt")
    )
    .sort()
    .map((file) => file); // ファイル名のみ返す
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
    const attachments = logs.map((logFile) => ({
      name: `📋 実行ログ`,
      source: logFile, // ファイル名のみ（allure-results直下にあるため）
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

// ログファイル数をカウント
const logFiles = fs
  .readdirSync(allureResultsDir)
  .filter((f) => f.endsWith(".txt"));
if (logFiles.length > 0) {
  console.log(`📋 Attached ${logFiles.length} log files`);
}
