import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testResults = JSON.parse(fs.readFileSync("./test-results.json", "utf8"));
const allureResultsDir = "./allure-results";

// allure-resultsディレクトリを作成
if (!fs.existsSync(allureResultsDir)) {
  fs.mkdirSync(allureResultsDir, { recursive: true });
}

// テスト結果をAllure形式に変換
testResults.testResults.forEach((testFile, fileIndex) => {
  testFile.assertionResults.forEach((test, testIndex) => {
    const uuid = `${Date.now()}-${fileIndex}-${testIndex}`;
    const result = {
      uuid: uuid,
      historyId: test.fullName,
      fullName: test.fullName,
      labels: [
        { name: "suite", value: testFile.name },
        { name: "package", value: path.dirname(testFile.name) },
      ],
      links: [],
      name: test.title,
      status: test.status === "passed" ? "passed" : "failed",
      stage: "finished",
      steps: [],
      attachments: [],
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
