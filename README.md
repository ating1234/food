# 🥗 台灣食品營養成分資料庫 (Taiwan Food Nutrition Database)

> 快速查詢 2,180 種台灣在地食品、104 項完整營養分析、每 100g 鉀/磷臨床分級指標、自訂攝取量換算與食品對比工具。
> 官方公開網址：**[https://food.ating123.com/](https://food.ating123.com/)**  
> 資料來源：中華民國衛生福利部食品藥物管理署（TFDA）食品營養成分資料庫。

---

## ✨ 核心特色與功能

- 🔍 **全域即時搜尋**：收錄 2,180 種食品，支援名稱、俗名/別名（如地瓜/甘藷）、英文名快速檢索。
- 🕒 **浮動最近搜尋紀錄**：點擊搜尋框下拉展開，最多自動維護 5 個搜尋關鍵字（支援最新置頂與一鍵清除）。
- 📂 **18 大食品分類**：穀物、蔬菜、水產、肉類、水果、乳品等完整分類與生活代表食品推薦。
- 📊 **104 項營養分析**：一般成分、礦物質、維生素、脂肪酸等，並含每日建議量（%DV）視覺化比例尺。
- 🟢 **鉀 (K) & 磷 (P) 臨床色彩分級**：卡片與詳情直接標記正常（綠）、偏高（橘）、過高（紅），友善腎友與健康飲食管理。
- ⚖️ **自訂攝取量換算**：輸入食用公克數，即時動態精確換算全部營養素。
- ❤️ **收藏與一鍵分享**：本機 `localStorage` 持久化儲存，支援 Web Share 原生分享與 JSON 匯出/匯入。
- 🆚 **食品橫向對比**：支援最多 3 種食品並排比對營養素差異。

---

## 🤖 自動化更新與版本連動機制 (Automated Updates)

本專案配置了完全零維護的 **GitHub Actions 雲端每月自動更新排程**，並支援全站版本數字自動連動。

### 1. 運作流程架構

```mermaid
flowchart LR
    A["GitHub Actions<br>(每月 1 號上午 10:00 自動執行)"] --> B["update_dataset.py<br>(檢查政府開放資料平台 API)"]
    B --> C{"比對 SHA256 雜湊<br>是否有新版本？"}
    C -- "無異動" --> D["保持靜默，不產生多餘 Commit"]
    C -- "發現新版" --> E["自動下載最新 JSON<br>解析新版本號 (如 20.6)"]
    E --> F["執行 preprocess.py 重構<br>foods_index.json & version.json"]
    F --> G["自動同步 HTML / SEO / LLMs 版本號"]
    G --> H["自動 Commit & Push<br>GitHub Pages 立即生效最新版"]
```

### 2. 核心檔案職責說明

| 檔案路徑 | 說明與職責 |
| :--- | :--- |
| `.github/workflows/update_data.yml` | **GitHub Actions 工作流程**：設定 Cron 每月 1 號定時執行，並支援在 GitHub 網頁上手動點擊「Run workflow」隨時觸發。 |
| `update_dataset.py` | **更新主程式**：連線政府資料開放平台 (data.gov.tw / TFDA)，比對資料雜湊，有新資料時自動下載、重構並同步全站版本數字。 |
| `preprocess.py` | **資料預處理核心**：將 18MB 原始資料清洗並拆解為 0.5MB 搜尋索引 `foods_index.json`、18 分類資料檔 `data/*.json` 與 `version.json`。 |
| `version.json` | **版本資訊檔**：記錄當前版本號、食品總數、各分類統計與生成時間戳記。 |

### 3. 版本數字（Version Number）全站自動連動

- **前端動態載入**：`app.js` 於網站啟動時讀取 `version.json`，自動將頂部標題列與頁尾的「資料來源：衛福部食藥署 第 XX 版」動態更新為最新版號。
- **靜態 SEO 標籤同步**：`update_dataset.py` 自動批次更新 `index.html`、`llms.txt`、`llms-full.txt` 中的版本文字，確保 Google 搜尋與 AI 爬蟲檢索永遠精確。

### 4. 手動執行與測試指令

```bash
# 1. 立即連線檢查官方是否有新版本
python3 update_dataset.py

# 2. 本地指定 JSON 檔案與版本號進行測試更新
python3 update_dataset.py 20_5.json 20.5

# 3. 本地啟動測試伺服器
python3 -m http.server 8765
# 開啟瀏覽器查看 http://127.0.0.1:8765
```

---

## 🌐 AI 搜尋 (GEO/LLM) 與 Google SEO 支援

- `robots.txt`：開放 Googlebot、Bingbot 以及 GPTBot、Claude-Web、PerplexityBot 等 AI 爬蟲。
- `llms.txt` / `llms-full.txt`：提供大語言模型專用的結構化資料摘要與引用規範。
- `sitemap.xml` & `sitemap.xsl`：提供搜尋引擎索引地圖與瀏覽器視覺化排版。
- `Schema.org JSON-LD`：標記 `WebSite`、`Dataset` 與 `WebApplication` 結構化資料。

---

## 📄 授權與宣告

- 資料來源版權屬**中華民國衛生福利部食品藥物管理署（TFDA）**所有。
- 本專案採用政府開放資料授權條款，數據僅供健康管理、學術與個人日常飲食參考使用。
