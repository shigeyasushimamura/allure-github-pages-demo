const fs = require("fs");
const path = require("path");

// 環境変数から情報取得
const runNumber = process.env.GITHUB_RUN_NUMBER || "unknown";
const branch = process.env.GITHUB_REF_NAME || "unknown";
const commitSha = process.env.GITHUB_SHA?.substring(0, 7) || "unknown";
const actor = process.env.GITHUB_ACTOR || "unknown";
const runTimestamp = new Date().toISOString();

// レポートタイプを判定
let reportType = "dev";
let reportPath = `dev/${runNumber}`;
let reportTitle = `開発ビルド #${runNumber}`;

// タグからリリースバージョンを判定
if (process.env.GITHUB_REF?.startsWith("refs/tags/")) {
  const version = process.env.GITHUB_REF.replace("refs/tags/", "");
  reportType = "release";
  reportPath = `releases/${version}`;
  reportTitle = `リリース ${version}`;
}

// 手動トリガー時は総合試験として扱う
if (process.env.GITHUB_EVENT_NAME === "workflow_dispatch") {
  const testCycle =
    process.env.TEST_CYCLE_NAME ||
    new Date().toISOString().split("T")[0] + "-ST";
  reportType = "test-cycle";
  reportPath = `test-cycles/${testCycle}`;
  reportTitle = `総合試験 ${testCycle}`;
}

// 既存のレポート一覧を取得
function getExistingReports(type) {
  const dir = `./gh-pages/${type}`;
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .map((name) => {
      const statsPath = path.join(dir, name, "widgets", "summary.json");
      let stats = null;
      if (fs.existsSync(statsPath)) {
        try {
          stats = JSON.parse(fs.readFileSync(statsPath, "utf8"));
        } catch (e) {}
      }
      return { name, stats };
    })
    .sort((a, b) => b.name.localeCompare(a.name));
}

const releases = getExistingReports("releases");
const testCycles = getExistingReports("test-cycles");
const devBuilds = getExistingReports("dev").slice(0, 10); // 最新10件のみ

// メタデータを保存
const metadata = {
  reportType,
  reportPath,
  reportTitle,
  runNumber,
  branch,
  commitSha,
  actor,
  timestamp: runTimestamp,
};

fs.writeFileSync("./report-metadata.json", JSON.stringify(metadata, null, 2));

// インデックスページHTML生成
const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>テストレポート - 総合試験証跡管理</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #f5f5f5;
      color: #333;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header h1 {
      font-size: 28px;
      margin-bottom: 10px;
    }
    .header p {
      opacity: 0.9;
      font-size: 14px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 30px 20px;
    }
    .section {
      background: white;
      border-radius: 8px;
      padding: 25px;
      margin-bottom: 25px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .section h2 {
      font-size: 20px;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #667eea;
      color: #667eea;
    }
    .report-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 15px;
    }
    .report-card {
      background: #f9f9f9;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      padding: 20px;
      transition: all 0.3s;
      position: relative;
    }
    .report-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .report-card.latest {
      border: 2px solid #FF9800;
      background: #FFF3E0;
    }
    .report-card.release {
      border-left: 4px solid #4CAF50;
    }
    .report-card.test-cycle {
      border-left: 4px solid #2196F3;
    }
    .report-card h3 {
      font-size: 18px;
      margin-bottom: 10px;
      color: #333;
    }
    .report-card a {
      color: #667eea;
      text-decoration: none;
      font-weight: 600;
      display: inline-block;
      margin-top: 10px;
    }
    .report-card a:hover {
      text-decoration: underline;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      margin-left: 8px;
    }
    .badge.latest { background: #FF9800; color: white; }
    .badge.passed { background: #4CAF50; color: white; }
    .badge.failed { background: #f44336; color: white; }
    .stats {
      display: flex;
      gap: 15px;
      margin-top: 12px;
      font-size: 13px;
    }
    .stat {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .stat-icon {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .stat-icon.passed { background: #4CAF50; }
    .stat-icon.failed { background: #f44336; }
    .stat-icon.total { background: #2196F3; }
    .meta {
      font-size: 12px;
      color: #666;
      margin-top: 10px;
    }
    .empty-state {
      text-align: center;
      padding: 40px;
      color: #999;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="container">
      <h1>📊 テストレポート - 総合試験証跡管理</h1>
      <p>プロジェクトの品質管理・証跡管理のための統合レポートシステム</p>
    </div>
  </div>

  <div class="container">
    <!-- 最新レポート -->
    <div class="section">
      <h2>🔥 最新のテストレポート</h2>
      <div class="report-grid">
        <div class="report-card latest">
          <h3>最新ビルド</h3>
          <a href="latest/" target="_blank">レポートを開く →</a>
          <div class="meta">常に最新のテスト結果を表示</div>
        </div>
      </div>
    </div>

    <!-- 総合試験サイクル -->
    <div class="section">
      <h2>🎯 総合試験レポート（正式証跡）</h2>
      ${
        testCycles.length > 0
          ? `
        <div class="report-grid">
          ${testCycles
            .map((report) => {
              const stats = report.stats?.statistic || {};
              const total = stats.total || 0;
              const passed = stats.passed || 0;
              const failed = stats.failed || 0;
              const passRate =
                total > 0 ? Math.round((passed / total) * 100) : 0;

              return `
              <div class="report-card test-cycle">
                <h3>${report.name}
                  ${
                    passRate === 100
                      ? '<span class="badge passed">合格</span>'
                      : '<span class="badge failed">不合格</span>'
                  }
                </h3>
                <a href="test-cycles/${
                  report.name
                }/" target="_blank">レポートを開く →</a>
                ${
                  stats.total
                    ? `
                  <div class="stats">
                    <div class="stat">
                      <div class="stat-icon total"></div>
                      <span>総数: ${total}</span>
                    </div>
                    <div class="stat">
                      <div class="stat-icon passed"></div>
                      <span>成功: ${passed}</span>
                    </div>
                    <div class="stat">
                      <div class="stat-icon failed"></div>
                      <span>失敗: ${failed}</span>
                    </div>
                  </div>
                  <div class="meta">合格率: ${passRate}%</div>
                `
                    : ""
                }
              </div>
            `;
            })
            .join("")}
        </div>
      `
          : '<div class="empty-state">まだ総合試験レポートがありません</div>'
      }
    </div>

    <!-- リリースレポート -->
    <div class="section">
      <h2>🚀 リリースレポート</h2>
      ${
        releases.length > 0
          ? `
        <div class="report-grid">
          ${releases
            .map((report) => {
              const stats = report.stats?.statistic || {};
              const total = stats.total || 0;
              const passed = stats.passed || 0;

              return `
              <div class="report-card release">
                <h3>${report.name}</h3>
                <a href="releases/${
                  report.name
                }/" target="_blank">レポートを開く →</a>
                ${
                  stats.total
                    ? `
                  <div class="stats">
                    <div class="stat">
                      <div class="stat-icon total"></div>
                      <span>総数: ${total}</span>
                    </div>
                    <div class="stat">
                      <div class="stat-icon passed"></div>
                      <span>成功: ${passed}</span>
                    </div>
                  </div>
                `
                    : ""
                }
              </div>
            `;
            })
            .join("")}
        </div>
      `
          : '<div class="empty-state">まだリリースレポートがありません</div>'
      }
    </div>

    <!-- 開発ビルド（参考用） -->
    <div class="section">
      <h2>💻 開発ビルド（参考用・最新10件）</h2>
      ${
        devBuilds.length > 0
          ? `
        <div class="report-grid">
          ${devBuilds
            .map(
              (report) => `
            <div class="report-card">
              <h3>Build #${report.name}</h3>
              <a href="dev/${report.name}/" target="_blank">レポートを開く →</a>
            </div>
          `
            )
            .join("")}
        </div>
      `
          : '<div class="empty-state">まだ開発ビルドがありません</div>'
      }
    </div>
  </div>
</body>
</html>
`;

// ディレクトリ作成
if (!fs.existsSync("./index-page")) {
  fs.mkdirSync("./index-page", { recursive: true });
}

// ファイル書き込み
fs.writeFileSync("./index-page/index.html", html);
console.log("✅ Index page created!");
console.log("📝 Report type:", reportType);
console.log("📂 Report path:", reportPath);
