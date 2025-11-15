const fs = require("fs");
const path = require("path");

const testResults = JSON.parse(fs.readFileSync("./test-results.json", "utf8"));
const allureResultsDir = "./allure-results";
const screenshotsDir = path.join(allureResultsDir, "screenshots");

// allure-resultsディレクトリを作成
if (!fs.existsSync(allureResultsDir)) {
  fs.mkdirSync(allureResultsDir, { recursive: true });
}

// スクリーンショットファイルを取得
function getScreenshotsForTest(testName) {
  if (!fs.existsSync(screenshotsDir)) {
    return [];
  }

  const files = fs.readdirSync(screenshotsDir);
  const testNameNormalized = testName.toLowerCase().replace(/[^a-z0-9]/g, "_");

  return files
    .filter(
      (file) => file.includes(testNameNormalized) && file.endsWith(".png")
    )
    .sort()
    .map((file) => ({
      filename: file,
      path: path.join(screenshotsDir, file),
    }));
}

// テスト結果をAllure形式に変換
testResults.testResults.forEach((testFile, fileIndex) => {
  testFile.assertionResults.forEach((test, testIndex) => {
    const uuid = `${Date.now()}-${fileIndex}-${testIndex}`;
    const testNameNormalized = test.title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_");

    // スクリーンショットを取得
    const screenshots = getScreenshotsForTest(testNameNormalized);

    // Allure形式のattachmentsを作成
    const attachments = screenshots.map((screenshot, index) => {
      const stepMatch = screenshot.filename.match(/_(\d+)_(.+?)_/);
      const stepName = stepMatch
        ? stepMatch[2].replace(/_/g, " ")
        : `ステップ${index + 1}`;

      return {
        name: `📸 ${stepName}`,
        source: screenshot.filename,
        type: "image/png",
      };
    });

    // テストタイプを判定（E2E or Unit）
    const isE2E = testFile.name.includes("e2e");
    const testType = isE2E ? "E2E Test" : "Unit Test";

    const result = {
      uuid: uuid,
      historyId: test.fullName,
      fullName: test.fullName,
      labels: [
        { name: "suite", value: testFile.name },
        { name: "package", value: path.dirname(testFile.name) },
        { name: "testClass", value: test.ancestorTitles[0] || "Unknown" },
        { name: "testMethod", value: test.title },
        { name: "tag", value: testType },
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
const screenshotCount = fs.existsSync(screenshotsDir)
  ? fs.readdirSync(screenshotsDir).length
  : 0;
if (screenshotCount > 0) {
  console.log(`📸 Attached ${screenshotCount} screenshots`);
}
