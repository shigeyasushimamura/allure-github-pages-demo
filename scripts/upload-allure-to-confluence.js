import fs from "fs";
import path from "path";
import fetch from "node-fetch";

// 環境変数から取得
const confluenceUrl = process.env.CONFLUENCE_URL;
const confluenceUser = process.env.CONFLUENCE_USER;
const confluenceToken = process.env.CONFLUENCE_TOKEN;
const parentPageId = process.env.CONFLUENCE_PAGE_ID;
const reportType = process.env.REPORT_TYPE || "dev";
const reportPath = process.env.REPORT_PATH || "unknown";

const allureResultsDir = "./allure-results";

async function uploadToConfluence() {
  if (!confluenceUrl || !confluenceUser || !confluenceToken || !parentPageId) {
    console.log("⚠️ Confluence環境変数が設定されていません。スキップします。");
    return;
  }

  // 総合試験とリリースのみConfluenceにアップロード
  if (reportType !== "test-cycle" && reportType !== "release") {
    console.log(
      `ℹ️ Report type: ${reportType} - Confluenceアップロードをスキップ`
    );
    return;
  }

  console.log(`📤 Confluenceへのアップロード開始: ${reportPath}`);

  // テスト結果を取得
  const testResults = getTestResults();

  // Confluence用のHTMLを生成
  const confluenceHtml = generateConfluenceHtml(testResults);

  // Confluenceページを作成
  await createConfluencePage(confluenceHtml);
}

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

function generateConfluenceHtml(testResults) {
  const timestamp = new Date().toLocaleString("ja-JP");
  const totalTests = Object.values(testResults).flat().length;
  const passedTests = Object.values(testResults)
    .flat()
    .filter((t) => t.status === "passed").length;
  const failedTests = totalTests - passedTests;
  const passRate =
    totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

  let html = `
<h1>📊 テストレポート - ${reportPath}</h1>
<p><strong>実行日時:</strong> ${timestamp}</p>

<h2>サマリー</h2>
<table>
  <tbody>
    <tr>
      <th>総テスト数</th>
      <td>${totalTests}</td>
    </tr>
    <tr>
      <th style="background-color: #e3fcef;">成功</th>
      <td>${passedTests}</td>
    </tr>
    <tr>
      <th style="background-color: #ffebe6;">失敗</th>
      <td>${failedTests}</td>
    </tr>
    <tr>
      <th>合格率</th>
      <td><strong>${passRate}%</strong></td>
    </tr>
  </tbody>
</table>

<ac:structured-macro ac:name="info">
  <ac:rich-text-body>
    <p>このレポートは自動生成されました。詳細なAllureレポートは <a href="https://github.com/${
      process.env.GITHUB_REPOSITORY || "your-repo"
    }/actions">GitHub Actions</a> から確認できます。</p>
  </ac:rich-text-body>
</ac:structured-macro>

<hr/>
`;

  // テストスイートごとに表示
  Object.entries(testResults).forEach(([suiteName, tests]) => {
    const suitePassed = tests.filter((t) => t.status === "passed").length;
    const suiteTotal = tests.length;
    const suitePassRate = Math.round((suitePassed / suiteTotal) * 100);

    html += `
<h2>📦 ${suiteName}</h2>
<p><strong>成功率:</strong> ${suitePassRate}% (${suitePassed}/${suiteTotal})</p>

<ac:structured-macro ac:name="expand">
  <ac:parameter ac:name="title">テストケース一覧を表示</ac:parameter>
  <ac:rich-text-body>
`;

    tests.forEach((test, index) => {
      const statusIcon = test.status === "passed" ? "✅" : "❌";
      const statusColor = test.status === "passed" ? "#e3fcef" : "#ffebe6";
      const duration = Math.round(test.duration);

      html += `
<h3>${statusIcon} ${test.name}</h3>
<table>
  <tbody>
    <tr>
      <th style="background-color: ${statusColor}; width: 150px;">ステータス</th>
      <td>${test.status === "passed" ? "成功" : "失敗"}</td>
    </tr>
    <tr>
      <th>実行時間</th>
      <td>${duration} ms</td>
    </tr>
  </tbody>
</table>
`;

      // 失敗時のエラーメッセージ
      if (test.statusDetails && test.statusDetails.message) {
        html += `
<ac:structured-macro ac:name="warning">
  <ac:rich-text-body>
    <p><strong>エラーメッセージ:</strong></p>
    <pre>${escapeHtml(test.statusDetails.message)}</pre>
  </ac:rich-text-body>
</ac:structured-macro>
`;
      }

      // ログを表示
      if (test.log) {
        html += `
<ac:structured-macro ac:name="expand">
  <ac:parameter ac:name="title">📋 実行ログを表示</ac:parameter>
  <ac:rich-text-body>
    <pre>${escapeHtml(test.log)}</pre>
  </ac:rich-text-body>
</ac:structured-macro>
`;
      }

      html += "<hr/>";
    });

    html += `
  </ac:rich-text-body>
</ac:structured-macro>
`;
  });

  return html;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function createConfluencePage(html) {
  const pageTitle = `テストレポート - ${reportPath} - ${new Date().toLocaleDateString(
    "ja-JP"
  )}`;

  const auth = Buffer.from(`${confluenceUser}:${confluenceToken}`).toString(
    "base64"
  );

  const pageData = {
    type: "page",
    title: pageTitle,
    ancestors: [{ id: parentPageId }],
    space: { key: await getSpaceKey() },
    body: {
      storage: {
        value: html,
        representation: "storage",
      },
    },
  };

  try {
    const response = await fetch(`${confluenceUrl}/rest/api/content`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(pageData),
    });

    if (response.ok) {
      const data = await response.json();
      const pageUrl = `${confluenceUrl}/pages/viewpage.action?pageId=${data.id}`;
      console.log("✅ Confluenceページ作成成功");
      console.log(`📄 ページURL: ${pageUrl}`);
      console.log(`📝 ページタイトル: ${pageTitle}`);
    } else {
      const errorText = await response.text();
      console.error("❌ Confluenceページ作成失敗");
      console.error(`Status: ${response.status}`);
      console.error(`Error: ${errorText}`);
    }
  } catch (error) {
    console.error("❌ エラー:", error.message);
  }
}

async function getSpaceKey() {
  const auth = Buffer.from(`${confluenceUser}:${confluenceToken}`).toString(
    "base64"
  );

  try {
    const response = await fetch(
      `${confluenceUrl}/rest/api/content/${parentPageId}?expand=space`,
      {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      return data.space.key;
    }
  } catch (error) {
    console.error("⚠️ Space key取得失敗:", error.message);
  }

  return "UNKNOWN";
}

uploadToConfluence().catch(console.error);
