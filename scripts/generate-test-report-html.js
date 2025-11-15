import fs from "fs";
import path from "path";

const allureResultsDir = "./allure-results";
const outputPath = "./test-report.html";
const reportPath = process.env.REPORT_PATH || "Test Report";

function getTestResults() {
  const jsonFiles = fs
    .readdirSync(allureResultsDir)
    .filter((f) => f.endsWith("-result.json"));

  const results = [];

  jsonFiles.forEach((file) => {
    const content = JSON.parse(
      fs.readFileSync(path.join(allureResultsDir, file), "utf8")
    );

    // ログファイルの内容を取得
    let logContent = "";
    if (content.attachments && content.attachments.length > 0) {
      const logFile = content.attachments.find((a) => a.type === "text/plain");
      if (logFile) {
        const logPath = path.join(allureResultsDir, logFile.source);
        if (fs.existsSync(logPath)) {
          logContent = fs.readFileSync(logPath, "utf8");
        }
      }
    }

    results.push({
      name: content.name,
      fullName: content.fullName,
      status: content.status,
      duration: content.stop - content.start,
      suite: content.labels.find((l) => l.name === "suite")?.value || "",
      testClass:
        content.labels.find((l) => l.name === "testClass")?.value || "",
      log: logContent,
      statusDetails: content.statusDetails,
    });
  });

  // テストスイート別にグループ化
  const grouped = {};
  results.forEach((r) => {
    const suite = r.testClass || "その他";
    if (!grouped[suite]) {
      grouped[suite] = [];
    }
    grouped[suite].push(r);
  });

  return grouped;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function generateHtml() {
  const testResults = getTestResults();
  const timestamp = new Date().toLocaleString("ja-JP");
  const totalTests = Object.values(testResults).flat().length;
  const passedTests = Object.values(testResults)
    .flat()
    .filter((t) => t.status === "passed").length;
  const failedTests = totalTests - passedTests;
  const passRate =
    totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

  let html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>テストレポート - ${reportPath}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f5f5f5;
      padding: 20px;
      line-height: 1.6;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    h1 {
      color: #333;
      margin-bottom: 10px;
      font-size: 32px;
    }
    .meta {
      color: #666;
      margin-bottom: 30px;
      font-size: 14px;
    }
    h2 {
      color: #667eea;
      margin-top: 40px;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #667eea;
      font-size: 24px;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }
    .summary-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
    }
    .summary-card.success { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); }
    .summary-card.failed { background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%); }
    .summary-card.rate { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
    .summary-card .label {
      font-size: 14px;
      opacity: 0.9;
      margin-bottom: 5px;
    }
    .summary-card .value {
      font-size: 36px;
      font-weight: bold;
    }
    .test-suite {
      margin-bottom: 40px;
    }
    .test-suite-header {
      background: #f8f9fa;
      padding: 15px 20px;
      border-radius: 6px;
      margin-bottom: 20px;
    }
    .test-suite-title {
      font-size: 20px;
      font-weight: 600;
      color: #333;
    }
    .test-suite-stats {
      font-size: 14px;
      color: #666;
      margin-top: 5px;
    }
    .test-case {
      background: #fff;
      border: 1px solid #e0e0e0;
      border-left: 4px solid #4CAF50;
      border-radius: 6px;
      padding: 20px;
      margin-bottom: 15px;
    }
    .test-case.failed {
      border-left-color: #f44336;
    }
    .test-case-header {
      display: flex;
      align-items: center;
      margin-bottom: 15px;
    }
    .test-case-icon {
      font-size: 24px;
      margin-right: 10px;
    }
    .test-case-name {
      font-size: 18px;
      font-weight: 600;
      color: #333;
      flex: 1;
    }
    .test-case-duration {
      font-size: 14px;
      color: #999;
    }
    .test-case-details {
      display: grid;
      grid-template-columns: 150px 1fr;
      gap: 10px;
      margin-bottom: 15px;
    }
    .detail-label {
      font-weight: 600;
      color: #666;
    }
    .detail-value {
      color: #333;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }
    .status-badge.passed {
      background: #e3fcef;
      color: #00875a;
    }
    .status-badge.failed {
      background: #ffebe6;
      color: #de350b;
    }
    .error-message {
      background: #ffebe6;
      border-left: 4px solid #de350b;
      padding: 15px;
      margin: 15px 0;
      border-radius: 4px;
    }
    .error-title {
      font-weight: 600;
      color: #de350b;
      margin-bottom: 10px;
    }
    .log-container {
      margin-top: 15px;
    }
    .log-toggle {
      background: #667eea;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      transition: background 0.3s;
    }
    .log-toggle:hover {
      background: #5568d3;
    }
    .log-content {
      display: none;
      background: #2d2d2d;
      color: #f8f8f2;
      padding: 20px;
      border-radius: 6px;
      margin-top: 10px;
      font-family: 'Courier New', monospace;
      font-size: 13px;
      line-height: 1.5;
      overflow-x: auto;
      white-space: pre-wrap;
    }
    .log-content.visible {
      display: block;
    }
    @media print {
      body { background: white; }
      .container { box-shadow: none; }
      .log-toggle { display: none; }
      .log-content { display: block !important; }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 テストレポート</h1>
    <div class="meta">
      <strong>レポート名:</strong> ${reportPath}<br>
      <strong>実行日時:</strong> ${timestamp}
    </div>

    <h2>サマリー</h2>
    <div class="summary">
      <div class="summary-card">
        <div class="label">総テスト数</div>
        <div class="value">${totalTests}</div>
      </div>
      <div class="summary-card success">
        <div class="label">成功</div>
        <div class="value">${passedTests}</div>
      </div>
      <div class="summary-card failed">
        <div class="label">失敗</div>
        <div class="value">${failedTests}</div>
      </div>
      <div class="summary-card rate">
        <div class="label">合格率</div>
        <div class="value">${passRate}%</div>
      </div>
    </div>
`;

  // テストスイートごとに表示
  Object.entries(testResults).forEach(([suiteName, tests]) => {
    const suitePassed = tests.filter((t) => t.status === "passed").length;
    const suiteTotal = tests.length;
    const suitePassRate = Math.round((suitePassed / suiteTotal) * 100);

    html += `
    <div class="test-suite">
      <div class="test-suite-header">
        <div class="test-suite-title">📦 ${escapeHtml(suiteName)}</div>
        <div class="test-suite-stats">
          成功率: ${suitePassRate}% (${suitePassed}/${suiteTotal})
        </div>
      </div>
`;

    tests.forEach((test, index) => {
      const statusIcon = test.status === "passed" ? "✅" : "❌";
      const duration = Math.round(test.duration);
      const testId = `test-${suiteName.replace(/[^a-z0-9]/gi, "-")}-${index}`;

      html += `
      <div class="test-case ${test.status === "failed" ? "failed" : ""}">
        <div class="test-case-header">
          <div class="test-case-icon">${statusIcon}</div>
          <div class="test-case-name">${escapeHtml(test.name)}</div>
          <div class="test-case-duration">${duration} ms</div>
        </div>
        
        <div class="test-case-details">
          <div class="detail-label">ステータス</div>
          <div class="detail-value">
            <span class="status-badge ${test.status}">${
        test.status === "passed" ? "成功" : "失敗"
      }</span>
          </div>
          
          <div class="detail-label">実行時間</div>
          <div class="detail-value">${duration} ms</div>
        </div>
`;

      // 失敗時のエラーメッセージ
      if (test.statusDetails && test.statusDetails.message) {
        html += `
        <div class="error-message">
          <div class="error-title">❌ エラーメッセージ</div>
          <pre style="margin: 0; white-space: pre-wrap;">${escapeHtml(
            test.statusDetails.message
          )}</pre>
        </div>
`;
      }

      // ログを表示
      if (test.log) {
        html += `
        <div class="log-container">
          <button class="log-toggle" onclick="toggleLog('${testId}')">📋 実行ログを表示/非表示</button>
          <div class="log-content" id="${testId}">${escapeHtml(test.log)}</div>
        </div>
`;
      }

      html += `
      </div>
`;
    });

    html += `
    </div>
`;
  });

  html += `
  </div>

  <script>
    function toggleLog(id) {
      const element = document.getElementById(id);
      element.classList.toggle('visible');
    }
  </script>
</body>
</html>
`;

  fs.writeFileSync(outputPath, html);
  console.log(`✅ HTMLレポート生成完了: ${outputPath}`);
  console.log(
    `📊 総テスト数: ${totalTests} (成功: ${passedTests}, 失敗: ${failedTests})`
  );
}

generateHtml();
