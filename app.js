const ratioLabels = {
  current_ratio: "流動比率",
  cash_ratio: "現金比率",
  debt_ratio: "負債比率",
  debt_to_equity: "負債權益比",
  gross_margin: "毛利率",
  operating_margin: "營業利益率",
  net_margin: "淨利率",
  roa: "資產報酬率",
  interest_coverage: "利息保障倍數",
  ocf_to_debt: "營業現金流/負債"
};

const sampleFinancials = [
  { year: 2022, revenue: 12800, gross_profit: 2940, operating_income: 1040, net_income: 690, total_assets: 9800, total_liabilities: 5100, current_assets: 4200, current_liabilities: 2600, cash: 920, equity: 4700, interest_expense: 150, operating_cash_flow: 780 },
  { year: 2023, revenue: 13450, gross_profit: 3090, operating_income: 1110, net_income: 740, total_assets: 10600, total_liabilities: 5700, current_assets: 4450, current_liabilities: 2850, cash: 880, equity: 4900, interest_expense: 180, operating_cash_flow: 720 },
  { year: 2024, revenue: 9150, gross_profit: 1590, operating_income: 240, net_income: 80, total_assets: 12100, total_liabilities: 8200, current_assets: 3950, current_liabilities: 4300, cash: 430, equity: 3900, interest_expense: 360, operating_cash_flow: -120 }
];

const sampleText = `客戶：明曜精密股份有限公司。主要產品為工業控制零組件，近三年外銷比重約六成。
2024 年因主要歐洲客戶延後拉貨，加上部分原料價格上升，營收與毛利率同步下滑。
公司於 2024 年新增短期借款以支應存貨與應收帳款週轉，利息費用明顯增加。
管理階層表示 2025 年將降低資本支出並處分閒置設備，預計改善自由現金流。
目前最大客戶占營收 34%，客戶集中度偏高，需持續追蹤訂單回補情形。`;

const manualDefault = [
  "2024 年營收較前一年明顯下滑，需確認是否為一次性訂單遞延。",
  "負債比率上升且短期償債壓力增加，建議檢視還款來源。",
  "營業現金流轉負，授信條件宜加入現金流與接單回補追蹤。",
  "可考慮維持額度但調整為較短天期，並提高財報更新頻率。"
].join("\n");

let financials = structuredClone(sampleFinancials);
let contextText = `${sampleText}\n${toCsv(sampleFinancials)}`;

const $ = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", () => {
  $("manualReview").value = manualDefault;
  $("contextText").value = contextText;
  $("runBtn").addEventListener("click", renderReport);
  $("loadSampleBtn").addEventListener("click", loadSample);
  $("financialFile").addEventListener("change", handleFile);
  document.querySelectorAll(".tab").forEach((button) => {
    button.addEventListener("click", () => switchTab(button.dataset.tab));
  });
  renderReport();
});

function loadSample() {
  financials = structuredClone(sampleFinancials);
  contextText = `${sampleText}\n${toCsv(sampleFinancials)}`;
  $("contextText").value = contextText;
  renderReport();
}

function handleFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const text = String(reader.result || "");
    if (file.name.toLowerCase().endsWith(".csv")) {
      financials = parseCsv(text);
      contextText = text;
    } else {
      contextText = text;
    }
    $("contextText").value = contextText;
    renderReport();
  };
  reader.readAsText(file, "utf-8");
}

function renderReport() {
  contextText = $("contextText").value || contextText;
  const manualPoints = $("manualReview").value.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const ratios = computeRatios(financials);
  const alerts = detectAnomalies(ratios);
  const { score, grade } = riskScore(alerts, ratios);
  const evidence = retrieveEvidence(contextText, ["營收 下滑 負債 利息 現金流 客戶集中 授信 風險", "revenue liabilities cash flow interest risk"], 5);
  const summary = generateSummary(ratios, alerts, score, grade, evidence);
  const comparison = compareWithManual(summary, alerts, manualPoints);

  const latest = ratios.at(-1);
  $("scoreMetric").textContent = `${score}/100`;
  $("gradeMetric").textContent = grade;
  $("alertMetric").textContent = alerts.length;
  $("yearMetric").textContent = latest.year || "--";
  $("summaryText").textContent = summary;

  renderTable("ratioTable", formatRatioRows(ratios));
  renderAlerts(alerts);
  renderEvidence(evidence);
  renderTable("compareTable", comparison);
  renderTable("rawTable", financials);
  drawTrendChart(ratios);
}

function parseCsv(text) {
  const rows = text.trim().split(/\r?\n/).filter(Boolean).map(parseCsvLine);
  const headers = rows.shift().map(normalizeHeader);
  return rows.map((row) => {
    const item = {};
    headers.forEach((header, index) => {
      item[header] = toNumber(row[index]);
    });
    return item;
  }).sort((a, b) => a.year - b.year);
}

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let quoted = false;
  for (const char of line) {
    if (char === "\"") {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function normalizeHeader(header) {
  const aliases = {
    "年度": "year", "年份": "year", "營收": "revenue", "營業收入": "revenue",
    "毛利": "gross_profit", "營業利益": "operating_income", "稅後淨利": "net_income",
    "淨利": "net_income", "資產總額": "total_assets", "總資產": "total_assets",
    "負債總額": "total_liabilities", "總負債": "total_liabilities", "流動資產": "current_assets",
    "流動負債": "current_liabilities", "現金": "cash", "現金及約當現金": "cash",
    "權益總額": "equity", "股東權益": "equity", "利息費用": "interest_expense",
    "營業現金流": "operating_cash_flow", "營業活動現金流量": "operating_cash_flow"
  };
  return aliases[header] || header;
}

function computeRatios(rows) {
  return rows.map((row, index) => {
    const previous = rows[index - 1] || {};
    return {
      ...row,
      current_ratio: div(row.current_assets, row.current_liabilities),
      cash_ratio: div(row.cash, row.current_liabilities),
      debt_ratio: div(row.total_liabilities, row.total_assets),
      debt_to_equity: div(row.total_liabilities, row.equity),
      gross_margin: div(row.gross_profit, row.revenue),
      operating_margin: div(row.operating_income, row.revenue),
      net_margin: div(row.net_income, row.revenue),
      roa: div(row.net_income, row.total_assets),
      interest_coverage: div(row.operating_income, row.interest_expense),
      ocf_to_debt: div(row.operating_cash_flow, row.total_liabilities),
      revenue_yoy: pct(row.revenue, previous.revenue),
      total_liabilities_yoy: pct(row.total_liabilities, previous.total_liabilities),
      net_income_yoy: pct(row.net_income, previous.net_income),
      operating_cash_flow_yoy: pct(row.operating_cash_flow, previous.operating_cash_flow)
    };
  });
}

function detectAnomalies(ratios) {
  const latest = ratios.at(-1);
  const checks = [
    ["營收暴跌", latest.revenue_yoy, -0.2, "lt", "營收年減超過 20%，需確認訂單遞延或需求惡化。", "high"],
    ["負債激增", latest.total_liabilities_yoy, 0.2, "gt", "總負債年增超過 20%，槓桿上升。", "medium"],
    ["流動性不足", latest.current_ratio, 1.0, "lt", "流動比率低於 1，短期償債緩衝不足。", "high"],
    ["現金覆蓋偏低", latest.cash_ratio, 0.2, "lt", "現金比率低於 0.2，需追蹤資金調度。", "medium"],
    ["獲利衰退", latest.net_margin, 0.03, "lt", "淨利率低於 3%，獲利安全墊偏薄。", "medium"],
    ["利息保障不足", latest.interest_coverage, 2.0, "lt", "利息保障倍數低於 2，還息能力承壓。", "high"],
    ["營業現金流轉弱", latest.ocf_to_debt, 0.0, "lt", "營業現金流對負債為負，還款來源需補強。", "high"]
  ];
  return checks.filter(([, value, threshold, direction]) => {
    if (!Number.isFinite(value)) return false;
    return direction === "lt" ? value < threshold : value > threshold;
  }).map(([name, value, threshold, , message, severity]) => ({ name, value, threshold, message, severity }));
}

function riskScore(alerts, ratios) {
  const latest = ratios.at(-1);
  let score = 50;
  alerts.forEach((alert) => {
    score += alert.severity === "high" ? 14 : 8;
  });
  if (latest.debt_ratio > 0.7) score += 10;
  if (latest.current_ratio > 1.5) score -= 8;
  score = Math.max(0, Math.min(100, Math.round(score)));
  const grade = score >= 75 ? "高風險" : score >= 55 ? "中風險" : "低至中風險";
  return { score, grade };
}

function retrieveEvidence(text, queries, topK) {
  const chunks = chunkText(text);
  const queryTokens = tokenize(queries.join(" "));
  return chunks.map((chunk) => {
    const chunkTokens = tokenize(chunk);
    const overlap = chunkTokens.filter((token) => queryTokens.includes(token)).length;
    const score = overlap / Math.max(1, Math.sqrt(chunkTokens.length * queryTokens.length));
    return { text: chunk, score };
  }).sort((a, b) => b.score - a.score).slice(0, topK);
}

function chunkText(text) {
  const parts = text.split(/[\n。；;]+/).map((part) => part.trim()).filter(Boolean);
  const chunks = [];
  let current = "";
  parts.forEach((part) => {
    if ((current + part).length > 260 && current) {
      chunks.push(current);
      current = part;
    } else {
      current = current ? `${current}。${part}` : part;
    }
  });
  if (current) chunks.push(current);
  return chunks.length ? chunks : [text.slice(0, 260)];
}

function generateSummary(ratios, alerts, score, grade, evidence) {
  const latest = ratios.at(-1);
  const previous = ratios.at(-2);
  const alertText = alerts.length ? alerts.map((alert) => alert.name).join("、") : "未觸發重大財務異常";
  const debtTrend = previous ? `負債比率由 ${fmtPct(previous.debt_ratio)} 變動至 ${fmtPct(latest.debt_ratio)}。` : "";
  const conditions = ["要求季度財報與銀行往來明細更新", "追蹤主要客戶訂單回補與應收帳款收現"];
  if (alerts.some((alert) => alert.name === "流動性不足")) conditions.push("新增短期借款餘額與現金水位 covenant");
  if (alerts.some((alert) => alert.name === "營業現金流轉弱")) conditions.push("撥款前確認營業現金流改善計畫");
  return `${latest.year} 年覆審結論：本案 AI 風險評分 ${score}/100，判定為「${grade}」。營收年增率為 ${fmtPct(latest.revenue_yoy)}，流動比率 ${fmtNum(latest.current_ratio)}，淨利率 ${fmtPct(latest.net_margin)}。${debtTrend}系統偵測項目包含：${alertText}。RAG 證據顯示：${evidence[0]?.text || "未取得可用文字證據。"}。建議授信策略為審慎維持或縮短週期覆審，條件包括：${conditions.join("；")}。`;
}

function compareWithManual(summary, alerts, manualPoints) {
  const aiText = `${summary} ${alerts.map((alert) => alert.message).join(" ")}`;
  const keywords = ["營收", "負債", "現金流", "授信", "短期", "利息", "客戶", "還款"];
  return manualPoints.map((point) => {
    const covered = keywords.some((keyword) => aiText.includes(keyword) && point.includes(keyword));
    return {
      "人工覆審重點": point,
      "AI 是否涵蓋": covered ? "是" : "待補強",
      "差異說明": covered ? "AI 摘要已涵蓋相近風險。" : "AI 未明確提及，需人工覆核或補充提示詞。"
    };
  });
}

function renderAlerts(alerts) {
  const list = $("alertList");
  if (!alerts.length) {
    list.innerHTML = `<article class="alert-card"><h4>未偵測到重大異常</h4><p>目前財務指標未觸發 PoC 規則。</p></article>`;
    return;
  }
  list.innerHTML = alerts.map((alert) => `
    <article class="alert-card ${alert.severity}">
      <h4>${alert.name} · ${alert.severity === "high" ? "高" : "中"}風險</h4>
      <p>${alert.message} 目前值：${fmtRaw(alert.value)}，門檻：${fmtRaw(alert.threshold)}</p>
    </article>
  `).join("");
}

function renderEvidence(evidence) {
  $("evidenceList").innerHTML = evidence.map((item, index) => `
    <article class="evidence-card">
      <h4>證據 ${index + 1} · 相似度 ${fmtNum(item.score)}</h4>
      <p>${escapeHtml(item.text)}</p>
    </article>
  `).join("");
}

function renderTable(id, rows) {
  const table = $(id);
  if (!rows.length) {
    table.innerHTML = "";
    return;
  }
  const headers = Object.keys(rows[0]);
  table.innerHTML = `
    <thead><tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr></thead>
    <tbody>${rows.map((row) => `<tr>${headers.map((header) => `<td>${escapeHtml(row[header])}</td>`).join("")}</tr>`).join("")}</tbody>
  `;
}

function formatRatioRows(ratios) {
  return ratios.map((row) => {
    const formatted = { "年度": row.year };
    Object.entries(ratioLabels).forEach(([key, label]) => {
      formatted[label] = ["gross_margin", "operating_margin", "net_margin", "roa", "debt_ratio", "ocf_to_debt"].includes(key)
        ? fmtPct(row[key])
        : fmtNum(row[key]);
    });
    return formatted;
  });
}

function drawTrendChart(ratios) {
  const canvas = $("trendChart");
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  const padding = 42;
  const series = [
    { key: "current_ratio", label: "流動比率", color: "#1f5eff" },
    { key: "debt_ratio", label: "負債比率", color: "#b42318" },
    { key: "net_margin", label: "淨利率", color: "#167c5b" }
  ];
  const values = ratios.flatMap((row) => series.map((item) => row[item.key])).filter(Number.isFinite);
  const min = Math.min(0, ...values);
  const max = Math.max(1, ...values);
  const x = (index) => padding + index * ((width - padding * 2) / Math.max(1, ratios.length - 1));
  const y = (value) => height - padding - ((value - min) / (max - min || 1)) * (height - padding * 2);

  ctx.strokeStyle = "#d9dee7";
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i += 1) {
    const gy = padding + i * ((height - padding * 2) / 3);
    ctx.beginPath();
    ctx.moveTo(padding, gy);
    ctx.lineTo(width - padding, gy);
    ctx.stroke();
  }

  series.forEach((item, seriesIndex) => {
    ctx.strokeStyle = item.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ratios.forEach((row, index) => {
      const px = x(index);
      const py = y(row[item.key]);
      if (index === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
    ctx.fillStyle = item.color;
    ctx.fillText(item.label, padding + seriesIndex * 110, 18);
  });

  ctx.fillStyle = "#667085";
  ratios.forEach((row, index) => ctx.fillText(String(row.year), x(index) - 14, height - 12));
}

function switchTab(tabId) {
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === tabId));
  document.querySelectorAll(".tab-page").forEach((page) => page.classList.toggle("active", page.id === tabId));
}

function toCsv(rows) {
  const headers = Object.keys(rows[0]);
  return [headers.join(","), ...rows.map((row) => headers.map((header) => row[header]).join(","))].join("\n");
}

function div(a, b) {
  return Number.isFinite(a) && Number.isFinite(b) && b !== 0 ? a / b : NaN;
}

function pct(a, b) {
  return Number.isFinite(a) && Number.isFinite(b) && b !== 0 ? (a - b) / b : NaN;
}

function toNumber(value) {
  const number = Number(String(value ?? "").replaceAll(",", ""));
  return Number.isFinite(number) ? number : value;
}

function fmtNum(value) {
  return Number.isFinite(value) ? value.toFixed(2) : "";
}

function fmtPct(value) {
  return Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : "";
}

function fmtRaw(value) {
  return Number.isFinite(value) && Math.abs(value) < 3 ? fmtNum(value) : String(value);
}

function tokenize(text) {
  const latin = text.toLowerCase().match(/[a-z0-9_]+/g) || [];
  const cjk = text.match(/[\u4e00-\u9fff]{2,}/g) || [];
  const grams = cjk.flatMap((term) => Array.from({ length: Math.max(term.length - 1, 1) }, (_, index) => term.slice(index, index + 2)));
  return [...latin, ...grams];
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}
