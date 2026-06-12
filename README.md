# 企業授信覆審 AI Agent PoC

純前端版本，商業邏輯全部使用 HTML、CSS、JavaScript 實作，不需要 Python、Streamlit 或後端服務。

## 使用方式

直接用瀏覽器開啟：

```text
index.html
```

或在檔案總管中雙擊 `index.html`。

## 功能

- 內建企業財報範例資料
- 支援上傳 CSV / TXT
- 使用 JavaScript 計算流動性、償債能力、獲利能力與現金流比率
- 使用規則式 anomaly detection 偵測營收暴跌、負債激增、利息保障不足等風險
- 使用 JavaScript 輕量 RAG 從財報文字擷取證據
- 自動生成覆審意見摘要
- 產出 AI vs 人工覆審差異對照表，降低 hallucination 風險

## CSV 欄位

建議欄位如下，可由 Excel 另存為 CSV 後上傳：

```text
year,revenue,gross_profit,operating_income,net_income,total_assets,total_liabilities,current_assets,current_liabilities,cash,equity,interest_expense,operating_cash_flow
```

也支援常見中文欄名，例如：年度、營收、毛利、營業利益、稅後淨利、資產總額、負債總額、流動資產、流動負債、現金、權益總額、利息費用、營業現金流。

## 檔案

```text
index.html  # 單頁介面
styles.css  # 視覺樣式
app.js      # 授信覆審商業邏輯
```

## PoC 限制

在「只能 HTML/CSS/JS」且不使用外部套件的限制下，瀏覽器端無法可靠解析原生 Excel `.xlsx` 或 PDF 表格。建議先將 Excel 另存為 CSV，PDF 重點文字可另存 TXT 或貼到文字脈絡區。
# 0612
