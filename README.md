# 食品營養成分

台灣食品營養成分查詢網站，資料來源：衛生福利部食品藥物管理署第 20.5 版。

## 功能
- 🔍 全域模糊搜尋（2,180 種食品）
- 📂 18 種食品分類瀏覽
- 📊 104 項詳細營養成分（含 DV 每日建議量比較）
- ⚖️ 自訂攝取量換算（輸入克數即時計算）
- ❤️ 收藏功能（localStorage 持久化）
- 🆚 食品比較（最多 3 種並排）

## 技術架構

```
foods_index.json     ← 0.5MB，全域搜尋索引（含 kcal）
version.json         ← 版本資訊
data/
  乳品類.json        ← 0.47MB，按需懶載入
  蔬菜類.json        ← 1.67MB
  魚貝類.json        ← 1.87MB
  ...（共 18 個，最大 1.87MB，全部符合 Cloudflare Pages 25MB 上限）
```

## 升級資料（更換新版 JSON）

```bash
# 1. 替換原始資料（衛福部官方下載）
mv 新版食品成分.json 20_5.json

# 2. 修改 preprocess.py 中的 VERSION 版本號
#    VERSION = "21.0"  ← 改成新版號

# 3. 重新處理
python3 preprocess.py

# 4. 推送 → Cloudflare Pages 自動部署
git add .
git commit -m "升級資料至 v21.0"
git push
```

## 本地開發

```bash
python3 -m http.server 8765
# 開啟 http://127.0.0.1:8765
```

## 部署

透過 Cloudflare Pages 連結 GitHub repo 自動部署：
- Build command：（留空，純靜態）
- Output directory：`/`（或留空）
- Root directory：`/`

## 授權

資料版權屬衛生福利部食品藥物管理署，本工具僅供學術與個人參考使用。
