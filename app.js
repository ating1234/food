/* ======================================================
   台灣食品營養成分資料庫 — app.js  v2
   ====================================================== */

// ===== 每日建議攝取量 (DV) =====
const DAILY_VALUES = {
  "熱量":         { dv: 2000, unit: "kcal" },
  "粗蛋白":       { dv: 60,   unit: "g" },
  "粗脂肪":       { dv: 65,   unit: "g" },
  "飽和脂肪":     { dv: 20,   unit: "g" },
  "總碳水化合物": { dv: 300,  unit: "g" },
  "膳食纖維":     { dv: 25,   unit: "g" },
  "鈉":           { dv: 2400, unit: "mg" },
  "鉀":           { dv: 2500, unit: "mg" },
  "鈣":           { dv: 1000, unit: "mg" },
  "磷":           { dv: 800,  unit: "mg" },
  "鎂":           { dv: 350,  unit: "mg" },
  "鐵":           { dv: 15,   unit: "mg" },
  "鋅":           { dv: 15,   unit: "mg" },
  "銅":           { dv: 0.9,  unit: "mg" },
  "錳":           { dv: 2.3,  unit: "mg" },
  "碘":           { dv: 150,  unit: "ug" },
  "硒":           { dv: 55,   unit: "ug" },
  "視網醇當量(RE)":          { dv: 700,  unit: "ug" },
  "維生素C":      { dv: 100,  unit: "mg" },
  "維生素D":      { dv: 10,   unit: "ug" },
  "α-維生素E當量(α-TE)":    { dv: 12,   unit: "mg" },
  "維生素B1":     { dv: 1.4,  unit: "mg" },
  "維生素B2":     { dv: 1.6,  unit: "mg" },
  "菸鹼素":       { dv: 15,   unit: "mg" },
  "葉酸":         { dv: 400,  unit: "ug" },
  "維生素B12":    { dv: 2.4,  unit: "ug" },
};

// ===== 自訂閾值（不依 DV %，直接以數值區間判斷色彩）=====
// thresholds: [{max, color}]，color: "ok" | "warn" | "danger"
const CUSTOM_THRESHOLDS = {
  "磷": [
    { max: 100,  color: "ok" },
    { max: 250,  color: "warn" },
    { max: Infinity, color: "danger" },
  ],
  "鉀": [
    { max: 100,  color: "ok" },
    { max: 200,  color: "warn" },
    { max: Infinity, color: "danger" },
  ],
};

// 取得自訂閾值色彩（回傳 null 表示無自訂）
function getCustomColor(name, value) {
  const thresholds = CUSTOM_THRESHOLDS[name];
  if (!thresholds || value === null) return null;
  for (const t of thresholds) {
    if (value <= t.max) return t.color;
  }
  return "danger";
}

// 隱藏的成分項目（不顯示在表格中）
const HIDDEN_ITEMS = new Set(["修正熱量", "灰分"]);

// 礦物質排序：鈣鈉鉀磷優先
const MINERAL_ORDER = ["鈣","鈉","鉀","磷","鎂","鐵","鋅","銅","錳","碘","硒","氟","鉻","鉬"];

// 一般成分排序（已移除「修正熱量」和「灰分」）
const GENERAL_ORDER = ["熱量","水分","粗蛋白","粗脂肪","飽和脂肪","總碳水化合物","膳食纖維"];

const CATEGORY_ORDER = ["一般成分","維生素A","維生素B群  & C","維生素D","維生素E","維生素K","脂肪酸組成","胺基酸組成","糖質分析","其他"];

const CAT_EMOJI = {
  "蔬菜類":"🥦","水果類":"🍎","穀物類":"🌾","澱粉類":"🥔","肉類":"🥩",
  "魚貝類":"🐟","蛋類":"🥚","乳品類":"🥛","豆類":"🫘","堅果及種子類":"🥜",
  "菇類":"🍄","藻類":"🌿","油脂類":"🫙","糖類":"🍯","飲料類":"🧃",
  "糕餅點心類":"🍰","調味料及香辛料類":"🧂","加工調理食品及其他類":"🍱",
};

// ===== 狀態 =====
let allFoods = [];

// 分類快取：category name → { code: foodData, ... }
const categoryCache   = {};
const categoryLoading = {}; // category name → Promise（防重複請求）

let currentCategory = null;
let currentFood = null;
let calcMode = "100g";
let activeNutrientTab = null;
let compareList = [];        // 最多 3
let favorites = new Set();   // 收藏（code 集合）


// ===== DOM =====
const $ = id => document.getElementById(id);
const searchInput    = $("searchInput");
const clearBtn       = $("clearBtn");
const searchHint     = $("searchHint");
const categoryList   = $("categoryList");
const foodGrid       = $("foodGrid");
const emptyState     = $("emptyState");
const modalOverlay   = $("modalOverlay");
const modalClose     = $("modalClose");
const modalFoodName  = $("modalFoodName");
const modalFoodEn    = $("modalFoodEn");
const modalFoodAlias = $("modalFoodAlias");
const modalMeta      = $("modalMeta");
const nutrientTabs   = $("nutrientTabs");
const nutrientContent= $("nutrientContent");
const calcInputWrap  = $("calcInputWrap");
const calcGrams      = $("calcGrams");
const btnCompareAdd  = $("btnCompareAdd");
const btnFavModal    = $("btnFavModal");
const compareBar     = $("compareBar");
const compareBarList = $("compareBarList");
const compareBarClear= $("compareBarClear");
const compareBarOpen = $("compareBarOpen");
const compareBadge   = $("compareBadge");
const compareHint    = $("compareHint");
const compareTableWrap=$("compareTableWrap");
const compareTable   = $("compareTable");
const compareCategory= $("compareCategory");
const clearCompare   = $("clearCompare");
const favToolbar     = $("favToolbar");
const favToolbarInfo = $("favToolbarInfo");
const btnExport      = $("btnExport");
const btnImportTrigger=$("btnImportTrigger");
const importFileInput= $("importFileInput");
const btnShare       = $("btnShare");
const btnHeaderShare = $("btnHeaderShare");
const mobileCatBar   = $("mobileCatBar");
const exploreSection = $("exploreSection");
const exploreGrid    = $("exploreGrid");
const emptyStateMsg  = $("emptyStateMsg");
const emptyStateSub  = $("emptyStateSub");
const searchHistory  = $("searchHistory");
const searchHistoryTags = $("searchHistoryTags");
const clearAllHistory = $("clearAllHistory");

// ===== 各分類圖示與生活代表熱門關鍵字 =====
const CATEGORY_ICONS = {
  "穀物類": "🌾",
  "澱粉類": "🍠",
  "堅果及種子類": "🥜",
  "豆類": "🫘",
  "蔬菜類": "🥦",
  "菇類": "🍄",
  "藻類": "🌊",
  "水果類": "🍎",
  "肉類": "🥩",
  "蛋類": "🥚",
  "魚貝類": "🐟",
  "乳品類": "🥛",
  "油脂類": "🫒",
  "糖類": "🍯",
  "飲料類": "☕",
  "調味料及香辛料類": "🧂",
  "糕餅點心類": "🍰",
  "加工調理食品及其他類": "🍲"
};

const POPULAR_KEYWORDS = {
  "肉類": ["牛肉", "羊肉", "雞胸肉", "去皮雞胸肉", "豬里肌", "牛里肌", "雞腿肉", "牛腱"],
  "乳品類": ["低脂鮮乳", "全脂鮮乳", "全脂牛奶", "起司", "優酪乳", "鮮乳", "莫札瑞拉"],
  "蛋類": ["雞蛋", "鴨蛋", "皮蛋", "鹹蛋", "水煮蛋"],
  "魚貝類": ["鮭魚", "鯖魚", "鮪魚", "白蝦", "文蛤", "牡蠣", "虱目魚", "鱸魚"],
  "蔬菜類": ["青花菜", "菠菜", "高麗菜", "地瓜葉", "胡蘿蔔", "番茄", "洋蔥", "蘆筍"],
  "水果類": ["蘋果", "香蕉", "奇異果", "芭樂", "葡萄", "柳橙", "木瓜", "酪梨"],
  "穀物類": ["燕麥", "糙米", "白米", "蕎麥", "小麥胚芽", "藜麥", "玉米"],
  "澱粉類": ["地瓜", "馬鈴薯", "芋頭", "南瓜", "山藥", "蓮藕", "紅豆"],
  "豆類": ["嫩豆腐", "板豆腐", "無糖豆漿", "豆漿", "毛豆", "黑豆", "黃豆"],
  "菇類": ["生鮮香菇", "香菇", "杏鮑菇", "金針菇", "黑木耳", "鴻喜菇", "白木耳"],
  "藻類": ["海苔", "紫菜", "海帶", "昆布", "裙帶菜", "寒天"],
  "堅果及種子類": ["杏仁", "核桃", "腰果", "南瓜子", "黑芝麻", "夏威夷豆", "花生"],
  "油脂類": ["橄欖油", "苦茶油", "酪梨油", "亞麻仁油", "芥花油", "沙拉油", "奶油"],
  "飲料類": ["綠茶", "紅茶", "烏龍茶", "黑咖啡", "無糖綠茶", "豆奶", "檸檬汁"],
  "糖類": ["蜂蜜", "黑糖", "果糖", "楓糖漿", "砂糖", "二砂"],
  "調味料及香辛料類": ["大蒜", "薑", "辣椒", "醬油", "黑胡椒", "白胡椒", "味噌"],
  "糕餅點心類": ["黑巧克力", "全麥麵包", "蘇打餅乾", "吐司", "布丁", "蛋糕"],
  "加工調理食品及其他類": ["貢丸", "水餃", "泡菜", "肉鬆", "香腸", "火腿"]
};

// ===== 初始化 =====
async function init() {
  loadFavorites();
  showLoading("正在載入食品索引…");
  try {
    const res = await fetch("foods_index.json");
    allFoods = await res.json();
    hideLoading();
    buildCategoryList();
    // 解析 URL hash（分享連結帶入的收藏）
    loadFromURLHash();
    // 渲染搜尋歷史紀錄
    renderSearchHistory();
    // 預設顯示「我的收藏」
    currentCategory = "__favorites__";
    filterAndRender();
  } catch(e) {
    hideLoading();
    searchHint.textContent = "❌ 載入失敗：" + e.message;
  }
}

// ===== 分類懶載入 =====

/** 載入指定分類的完整資料（已載入則直接回傳，防重複請求） */
async function loadCategory(category) {
  if (categoryCache[category]) return;
  if (categoryLoading[category]) return categoryLoading[category];
  categoryLoading[category] = fetch(`data/${encodeURIComponent(category)}.json`)
    .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
    .then(data => {
      categoryCache[category] = data;
      delete categoryLoading[category];
    })
    .catch(err => {
      delete categoryLoading[category];
      console.error(`載入 ${category} 失敗:`, err);
    });
  return categoryLoading[category];
}

/** 從索引找出食品的分類，確保該分類已載入，並回傳完整食品資料 */
async function ensureFoodData(code) {
  const idx = allFoods.find(f => f.code === code);
  if (!idx) return null;
  await loadCategory(idx.category);
  return categoryCache[idx.category]?.[code] || null;
}


// ===== 收藏 =====
function loadFavorites() {
  try {
    const saved = JSON.parse(localStorage.getItem("food_favorites") || "[]");
    favorites = new Set(saved);
  } catch { favorites = new Set(); }
}
function saveFavorites() {
  localStorage.setItem("food_favorites", JSON.stringify([...favorites]));
}
function toggleFavorite(code, btn) {
  if (favorites.has(code)) {
    favorites.delete(code);
    if (btn) { btn.textContent = "🤍"; btn.classList.remove("fav-on"); }
  } else {
    favorites.add(code);
    if (btn) { btn.textContent = "❤️"; btn.classList.add("fav-on"); }
  }
  saveFavorites();
  // 若目前在收藏分類，重新渲染
  if (currentCategory === "__favorites__") filterAndRender();
  // 更新 modal 按鈕
  if (currentFood && currentFood.code === code) syncFavModalBtn();
  // 更新側欄計數
  updateFavCount();
}
function syncFavModalBtn() {
  if (!currentFood) return;
  const on = favorites.has(currentFood.code);
  btnFavModal.textContent = on ? "❤️ 已收藏" : "🤍 收藏";
  btnFavModal.classList.toggle("fav-on", on);
}
function updateFavCount() {
  const el = document.getElementById("favCount");
  if (el) el.textContent = favorites.size;
  const mEl = document.getElementById("mFavCount");
  if (mEl) mEl.textContent = favorites.size;
}

// ===== 收藏工具列控制 =====
function updateFavToolbar() {
  const isFavView = currentCategory === "__favorites__";
  favToolbar.style.display = isFavView ? "flex" : "none";
  if (isFavView) {
    favToolbarInfo.textContent = favorites.size > 0
      ? `已收藏 ${favorites.size} 種食品`
      : "";
  }
}

// ===== 從 URL Hash 載入分享收藏 =====
function loadFromURLHash() {
  const hash = location.hash;
  if (!hash.startsWith("#fav=")) return;
  try {
    const codes = decodeURIComponent(hash.slice(5)).split(",").filter(Boolean);
    const valid  = codes.filter(c => allFoods.some(f => f.code === c));
    if (valid.length === 0) return;
    valid.forEach(c => favorites.add(c));
    saveFavorites();
    updateFavCount();
    history.replaceState(null, "", location.pathname); // 清除 hash
    showToast(`📥 已從分享連結載入 ${valid.length} 筆收藏`);
  } catch { /* 忽略格式錯誤 */ }
}

// ===== 匯出收藏 =====
function exportFavorites() {
  if (favorites.size === 0) { showToast("尚未收藏任何食品"); return; }
  const favFoods = allFoods.filter(f => favorites.has(f.code));
  const data = {
    app:      "食品營養成分",
    version:  "1.0",
    exported: new Date().toISOString(),
    count:    favFoods.length,
    favorites: favFoods.map(f => ({ code: f.code, name: f.name, category: f.category })),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `我的食品收藏_${new Date().toLocaleDateString("zh-TW").replace(/\//g,"-")}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`📤 已匯出 ${favFoods.length} 筆收藏`);
}

// ===== 匯入收藏 =====
function importFavorites(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data  = JSON.parse(e.target.result);
      let   codes = [];

      if (Array.isArray(data)) {
        // 純 code 陣列格式
        codes = data;
      } else if (data.favorites && Array.isArray(data.favorites)) {
        // 本站匯出格式
        codes = data.favorites.map(f => (typeof f === "string" ? f : f.code));
      } else {
        showToast("❌ 格式不正確，請使用本站匯出的 JSON 檔"); return;
      }

      const before  = favorites.size;
      const valid   = codes.filter(c => allFoods.some(f => f.code === c));
      const invalid = codes.length - valid.length;
      valid.forEach(c => favorites.add(c));
      saveFavorites();
      updateFavCount();

      const added = favorites.size - before;
      let msg = `📥 已匯入 ${added} 筆新收藏`;
      if (invalid > 0) msg += `（${invalid} 筆無效已略過）`;
      if (added === 0 && invalid === 0) msg = "所有項目已存在收藏中";
      showToast(msg);
      filterAndRender();
    } catch {
      showToast("❌ 讀取失敗，請確認檔案格式");
    }
  };
  reader.readAsText(file);
}

// ===== 智慧分享（帶 Logo、網站名、摘要亮點與連結）=====
async function shareContent(shareFavOnly = false) {
  let url = `${location.origin}${location.pathname}`;
  let title = "🥗 食品營養成分 - 台灣食品營養成分資料庫";
  let summary = "🥗【食品營養成分】台灣食品營養成分資料庫\n✨ 快速查詢 2,180 種台灣食品、104 項完整營養分析\n⚖️ 支援自訂攝取量換算與多食品比較！";
  let clipboardText = "";

  if (favorites.size > 0 && shareFavOnly) {
    const codes = [...favorites].join(",");
    url = `${location.origin}${location.pathname}#fav=${encodeURIComponent(codes)}`;
    title = "🥗 我的食品營養收藏清單 - 食品營養成分";
    summary = `🥗【我的食品營養收藏清單】食品營養成分\n❤️ 與您分享我收藏的 ${favorites.size} 種食品清單，點擊即可直接查看營養成分與對比！`;
    clipboardText = `${summary}\n👉 點擊查看清單：${url}`;
  } else {
    if (shareFavOnly) {
      showToast("目前尚未收藏食品，為您分享網站首頁");
    }
    clipboardText = `${summary}\n👉 立即前往查詢：${url}`;
  }

  // 1. 手機端 / 支援環境優先使用原生 Web Share
  if (navigator.share) {
    try {
      await navigator.share({ title, text: summary, url });
      return;
    } catch (err) {
      if (err.name === "AbortError") return; // 使用者主動取消分享
      console.warn("Web Share 呼叫失敗，改用剪貼簿複製：", err);
    }
  }

  // 2. Fallback：複製包含 Logo、網站名與摘要的完整內容至剪貼簿
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(clipboardText)
      .then(() => showToast(favorites.size > 0 && shareFavOnly ? "📋 收藏分享卡片與連結已複製！" : "📋 網站分享內容與連結已複製！"))
      .catch(() => prompt("複製此分享內容：", clipboardText));
  } else {
    prompt("複製此分享內容：", clipboardText);
  }
}

// ===== 工具列按鈕事件 =====
btnExport.addEventListener("click", exportFavorites);
btnImportTrigger.addEventListener("click", () => importFileInput.click());
importFileInput.addEventListener("change", e => {
  const file = e.target.files[0];
  if (file) { importFavorites(file); importFileInput.value = ""; }
});
btnShare.addEventListener("click", () => shareContent(true));
if (btnHeaderShare) {
  btnHeaderShare.addEventListener("click", () => shareContent(false));
}


// ===== 分類列表（同步建立桌面側欄與手機滑動標籤）=====
function buildCategoryList() {
  const counts = {};
  allFoods.forEach(f => { counts[f.category] = (counts[f.category]||0) + 1; });
  const cats = Object.keys(counts).sort();

  categoryList.innerHTML = "";
  if (mobileCatBar) mobileCatBar.innerHTML = "";

  // ── 我的收藏（置頂）──
  const favLi = makeCatLi("❤️ 我的收藏", favorites.size, true, "favCount", "__favorites__");
  favLi.addEventListener("click", () => selectCategory("__favorites__"));
  categoryList.appendChild(favLi);

  if (mobileCatBar) {
    const favPill = makeCatPill("❤️ 我的收藏", favorites.size, true, "mFavCount", "__favorites__");
    favPill.addEventListener("click", () => selectCategory("__favorites__"));
    mobileCatBar.appendChild(favPill);
  }

  // ── 分隔線 ──
  const sep1 = document.createElement("li");
  sep1.className = "cat-sep";
  categoryList.appendChild(sep1);

  // ── 全部 ──
  const allLi = makeCatLi("🍽️ 全部", allFoods.length, false, "", "__all__");
  allLi.addEventListener("click", () => selectCategory(null));
  categoryList.appendChild(allLi);

  if (mobileCatBar) {
    const allPill = makeCatPill("🍽️ 全部", allFoods.length, false, "", "__all__");
    allPill.addEventListener("click", () => selectCategory(null));
    mobileCatBar.appendChild(allPill);
  }

  // ── 各食品分類 ──
  cats.forEach(cat => {
    const emoji = CAT_EMOJI[cat] || "🍴";
    const li = makeCatLi(`${emoji} ${cat}`, counts[cat], false, "", cat);
    li.addEventListener("click", () => selectCategory(cat));
    categoryList.appendChild(li);

    if (mobileCatBar) {
      const pill = makeCatPill(`${emoji} ${cat}`, counts[cat], false, "", cat);
      pill.addEventListener("click", () => selectCategory(cat));
      mobileCatBar.appendChild(pill);
    }
  });
}

function selectCategory(cat) {
  currentCategory = cat;
  setActiveCat(cat);
  filterAndRender();
}

function makeCatLi(label, count, active=false, countId="", catKey="") {
  const li = document.createElement("li");
  li.dataset.cat = catKey || (label.includes("全部") ? "__all__" : label);
  if (active) li.classList.add("active");
  li.innerHTML = `<span>${label}</span><span class="cat-count"${countId?` id="${countId}`:""}">${count}</span>`;
  return li;
}

function makeCatPill(label, count, active=false, countId="", catKey="") {
  const pill = document.createElement("button");
  pill.className = "mcat-pill" + (active ? " active" : "");
  pill.dataset.cat = catKey || (label.includes("全部") ? "__all__" : label);
  pill.innerHTML = `<span>${label}</span><span class="mcat-count"${countId?` id="${countId}`:""}>${count}</span>`;
  return pill;
}

function setActiveCat(cat) {
  const key = cat === null ? "__all__" : cat;
  document.querySelectorAll("#categoryList li").forEach(l => {
    l.classList.toggle("active", l.dataset.cat === key);
  });
  if (mobileCatBar) {
    document.querySelectorAll("#mobileCatBar .mcat-pill").forEach(p => {
      const isAct = p.dataset.cat === key;
      p.classList.toggle("active", isAct);
      if (isAct) {
        p.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    });
  }
}

// ===== 搜尋相關性評分 =====
// score 越高排越前面
// 6：名稱完全等於搜尋詞
// 5：俗名 / 英文完全等於搜尋詞
// 4：名稱包含完整搜尋字串
// 3：俗名 / 英文包含完整搜尋字串
// 2：名稱包含搜尋詞的「所有字元」（任意順序）
// 1：名稱包含搜尋詞的「第一個字元」（同類食材模糊擴展，如搜「羊肉」也能找「羊排」）
// 0：不相關，不顯示
function scoreFood(food, q, chars) {
  const name  = food.name.toLowerCase();
  const alias = food.alias.toLowerCase();
  const en    = food.en_name.toLowerCase();

  if (name === q)                                return 6;
  if (alias === q || en === q)                   return 5;
  if (name.includes(q))                         return 4;
  if (alias.includes(q) || en.includes(q))      return 3;
  if (chars.every(c => name.includes(c)))       return 2;
  // 只用「第一個字元」做模糊延伸，避免「肉」字誤抓所有肉類
  if (chars.length > 0 && name.includes(chars[0])) return 1;
  return 0;
}

// ===== 搜尋歷史管理（浮動下拉、保持 5 個以內）=====
const MAX_SEARCH_HISTORY = 5;

function getSearchHistory() {
  try {
    return JSON.parse(localStorage.getItem("food_search_history") || "[]");
  } catch {
    return [];
  }
}

function saveSearchHistoryList(list) {
  localStorage.setItem("food_search_history", JSON.stringify(list));
}

function addSearchHistory(query) {
  const q = query.trim();
  if (!q || q.length < 1) return;
  // 去除已有的相同字詞（不分大小寫）
  let history = getSearchHistory().filter(item => item.toLowerCase() !== q.toLowerCase());
  // 最新置頂
  history.unshift(q);
  // 保持最多 5 個
  if (history.length > MAX_SEARCH_HISTORY) {
    history = history.slice(0, MAX_SEARCH_HISTORY);
  }
  saveSearchHistoryList(history);
  renderSearchHistory();
}

function removeSearchHistoryItem(query, e) {
  if (e) e.stopPropagation();
  let history = getSearchHistory().filter(item => item !== query);
  saveSearchHistoryList(history);
  renderSearchHistory();
  if (history.length === 0) {
    hideSearchHistoryDropdown();
  }
}

function clearAllSearchHistory() {
  localStorage.removeItem("food_search_history");
  renderSearchHistory();
  hideSearchHistoryDropdown();
}

function showSearchHistoryDropdown() {
  if (!searchHistory) return;
  const history = getSearchHistory();
  if (history.length > 0) {
    renderSearchHistory();
    searchHistory.style.display = "block";
  } else {
    searchHistory.style.display = "none";
  }
}

function hideSearchHistoryDropdown() {
  if (searchHistory) {
    searchHistory.style.display = "none";
  }
}

function renderSearchHistory() {
  if (!searchHistory || !searchHistoryTags) return;
  const history = getSearchHistory();
  if (history.length === 0) {
    searchHistory.style.display = "none";
    return;
  }

  searchHistoryTags.innerHTML = "";

  const frag = document.createDocumentFragment();
  history.forEach(item => {
    const tag = document.createElement("div");
    tag.className = "sh-tag";
    tag.innerHTML = `
      <span class="sh-tag-text">${item}</span>
      <button class="sh-tag-del" title="刪除此紀錄">✕</button>
    `;

    tag.querySelector(".sh-tag-text").addEventListener("click", () => {
      searchInput.value = item;
      addSearchHistory(item); // 再次搜尋時自動置頂
      filterAndRender();
      hideSearchHistoryDropdown();
      searchInput.focus();
    });

    tag.querySelector(".sh-tag-del").addEventListener("click", (e) => {
      removeSearchHistoryItem(item, e);
    });

    frag.appendChild(tag);
  });

  searchHistoryTags.appendChild(frag);
}

if (clearAllHistory) {
  clearAllHistory.addEventListener("click", clearAllSearchHistory);
}

// 點擊歷史容器內阻止預設行爲（防止失焦提早關閉下拉選單）
if (searchHistory) {
  searchHistory.addEventListener("mousedown", (e) => {
    e.preventDefault();
  });
}

// 點擊外部區域時自動收起下拉浮動選單
document.addEventListener("click", (e) => {
  if (searchInput && searchHistory) {
    if (!searchInput.contains(e.target) && !searchHistory.contains(e.target)) {
      hideSearchHistoryDropdown();
    }
  }
});

let searchTimer = null;
let saveHistoryTimer = null;

searchInput.addEventListener("focus", showSearchHistoryDropdown);
searchInput.addEventListener("click", showSearchHistoryDropdown);

searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  clearTimeout(saveHistoryTimer);
  searchTimer = setTimeout(filterAndRender, 180);
  
  const raw = searchInput.value.trim();
  if (raw.length >= 2) {
    saveHistoryTimer = setTimeout(() => {
      addSearchHistory(raw);
    }, 1200);
  }
});

searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    clearTimeout(saveHistoryTimer);
    const raw = searchInput.value.trim();
    if (raw) {
      addSearchHistory(raw);
      filterAndRender();
      hideSearchHistoryDropdown();
      searchInput.blur();
    }
  }
});

clearBtn.addEventListener("click", () => {
  searchInput.value = "";
  clearTimeout(saveHistoryTimer);
  filterAndRender();
  showSearchHistoryDropdown();
  searchInput.focus();
});

function filterAndRender() {
  const raw = searchInput.value.trim();
  const q   = raw.toLowerCase();

  // 同步收藏工具列顯示狀態
  updateFavToolbar();

  // ── 無搜尋字串：依分類篩選 ──
  if (!q) {
    let results = allFoods;
    if (currentCategory === "__favorites__") {
      results = results.filter(f => favorites.has(f.code));
    } else if (currentCategory) {
      results = results.filter(f => f.category === currentCategory);
    }
    renderFoods(results);
    const catLabel = currentCategory === "__favorites__" ? "我的收藏" : currentCategory;
    if (currentCategory === "__favorites__" && favorites.size === 0) {
      searchHint.textContent = "💡 尚未收藏食品，為您精選各分類推薦（點擊直接查閱完整營養分析）";
    } else {
      searchHint.textContent = `共 ${results.length.toLocaleString()} 種食品${catLabel ? `（${catLabel}）` : ""}`;
    }
    return;
  }

  // ── 有搜尋字串：全域搜尋 + 相關性排序 ──
  const chars = [...q]; // 拆成個別字元，用於模糊匹配

  // 計算每筆食品的 score
  const scored = [];
  for (const food of allFoods) {
    const s = scoreFood(food, q, chars);
    if (s === 0) continue;

    // 是否屬於當前分類（用來決定排序）
    let inCurrent = false;
    if (currentCategory === "__favorites__") inCurrent = favorites.has(food.code);
    else if (currentCategory)               inCurrent = food.category === currentCategory;
    else                                    inCurrent = true; // 全部模式都算

    scored.push({ food, s, inCurrent });
  }

  // 排序：同 score 時，當前分類優先；score 不同時高分優先
  scored.sort((a, b) => {
    if (a.s !== b.s)            return b.s - a.s;   // 高分先
    if (a.inCurrent !== b.inCurrent) return a.inCurrent ? -1 : 1; // 當前分類先
    return 0;
  });

  const results = scored.map(x => x.food);

  // 計算當前分類命中數，用於 hint
  const inCatCount = scored.filter(x => x.inCurrent).length;
  const otherCount = results.length - inCatCount;
  const catLabel   = currentCategory === "__favorites__" ? "我的收藏" : currentCategory;

  let hint = `找到 ${results.length} 筆（搜尋：「${raw}」）`;
  if (catLabel && inCatCount > 0 && otherCount > 0) {
    hint += ` — ${catLabel} ${inCatCount} 筆 · 其他分類 ${otherCount} 筆`;
  } else if (catLabel && inCatCount === 0 && otherCount > 0) {
    hint += ` — ${catLabel} 無結果，顯示其他分類`;
  }
  searchHint.textContent = hint;

  renderFoods(results);
}

// ===== 隨機精選各分類生活推薦範例 =====
function getExploreFoods() {
  if (!allFoods || allFoods.length === 0) return [];
  
  const categories = Object.keys(CATEGORY_ICONS);
  const selectedFoods = [];
  const selectedCodes = new Set();

  categories.forEach(cat => {
    const catFoods = allFoods.filter(f => f.category === cat);
    if (catFoods.length === 0) return;

    // 優先挑選常用熱門關鍵字符合者
    const kws = POPULAR_KEYWORDS[cat] || [];
    const matched = catFoods.filter(f => kws.some(kw => f.name.includes(kw)));
    
    // 隨機選一個
    let pick = null;
    if (matched.length > 0) {
      pick = matched[Math.floor(Math.random() * matched.length)];
    } else {
      pick = catFoods[Math.floor(Math.random() * catFoods.length)];
    }

    if (pick && !selectedCodes.has(pick.code)) {
      selectedFoods.push(pick);
      selectedCodes.add(pick.code);
    }

    // 對於特別常見熱門分類（肉類、乳品類、蔬菜類、水果類、魚貝類），多隨機挑一個不同的項目增加多元美感
    if (["肉類", "蔬菜類", "水果類", "魚貝類", "乳品類"].includes(cat)) {
      const remaining = catFoods.filter(f => !selectedCodes.has(f.code));
      if (remaining.length > 0) {
        const extraMatched = remaining.filter(f => kws.some(kw => f.name.includes(kw)));
        const extraPick = extraMatched.length > 0 
          ? extraMatched[Math.floor(Math.random() * extraMatched.length)]
          : remaining[Math.floor(Math.random() * remaining.length)];
        if (extraPick && !selectedCodes.has(extraPick.code)) {
          selectedFoods.push(extraPick);
          selectedCodes.add(extraPick.code);
        }
      }
    }
  });

  return selectedFoods;
}

function renderExploreSection() {
  if (!exploreGrid) return;
  const exploreList = getExploreFoods();
  exploreGrid.innerHTML = "";
  
  const frag = document.createDocumentFragment();
  exploreList.forEach(food => {
    const icon = CATEGORY_ICONS[food.category] || "🥗";
    const catShort = food.category.replace("類","").replace("及其他","");

    const card = document.createElement("div");
    card.className = "explore-card";
    card.dataset.code = food.code;
    card.innerHTML = `
      <div class="exp-card-left">
        <span class="exp-icon">${icon}</span>
        <div class="exp-info">
          <span class="exp-name" title="${food.name}">${food.name}</span>
          <span class="exp-cat">${catShort}</span>
        </div>
      </div>
      <span class="exp-action" title="點擊查看成分">查成分 ➔</span>
    `;

    card.addEventListener("click", () => {
      openDetail(food.code);
    });

    frag.appendChild(card);
  });

  exploreGrid.appendChild(frag);
}

// ===== 渲染食品卡片 =====
function renderFoods(foods) {
  const isFavView = currentCategory === "__favorites__";
  const hasNoFavorites = favorites.size === 0;
  const isNoSearch = !searchInput.value.trim();

  // 若在我的收藏視圖且尚未有收藏、且未進行搜尋：顯示探索推薦區塊
  if (isFavView && hasNoFavorites && isNoSearch) {
    if (exploreSection) {
      exploreSection.style.display = "block";
      renderExploreSection();
    }
    foodGrid.style.display = "none";
    emptyState.style.display = "none";
    return;
  }

  if (exploreSection) exploreSection.style.display = "none";

  foodGrid.innerHTML = "";
  if (foods.length === 0) {
    foodGrid.style.display = "none";
    emptyState.style.display = "block";
    return;
  }
  
  emptyState.style.display = "none";
  foodGrid.style.display = "grid";

  const slice = foods.slice(0, 200);
  const frag  = document.createDocumentFragment();

  slice.forEach(food => {
    const inCompare  = compareList.some(f => f.code === food.code);
    const isFav      = favorites.has(food.code);

    const card = document.createElement("div");
    card.className = "food-card" + (inCompare ? " in-compare" : "");
    card.dataset.code = food.code;
    card.dataset.catShort = food.category.replace("類","").replace("及其他","");

    const kVal = (food.k !== null && food.k !== undefined) ? food.k : "—";
    const pVal = (food.p !== null && food.p !== undefined) ? food.p : "—";
    const kColor = getCustomColor("鉀", food.k);
    const pColor = getCustomColor("磷", food.p);
    const kClass = kColor === "danger" ? "min-danger" : kColor === "warn" ? "min-warn" : kColor === "ok" ? "min-ok" : "";
    const pClass = pColor === "danger" ? "min-danger" : pColor === "warn" ? "min-warn" : pColor === "ok" ? "min-ok" : "";

    card.innerHTML = `
      <button class="card-fav-btn${isFav?" fav-on":""}" data-code="${food.code}" title="收藏">${isFav?"❤️":"🤍"}</button>
      <div class="card-name">${food.name}</div>
      <div class="card-en">${food.en_name || "&nbsp;"}</div>
      <div class="card-alias">${food.alias ? "別名："+food.alias : "&nbsp;"}</div>
      <div class="card-minerals">
        <div class="card-mineral-item card-min-k ${kClass}">
          <span class="cmin-label">鉀</span>
          <span class="cmin-val">${kVal}</span>
          <span class="cmin-unit">mg</span>
        </div>
        <div class="card-mineral-item card-min-p ${pClass}">
          <span class="cmin-label">磷</span>
          <span class="cmin-val">${pVal}</span>
          <span class="cmin-unit">mg</span>
        </div>
      </div>
      <button class="card-compare-btn${inCompare?" active":""}" data-code="${food.code}" title="${inCompare?"移出比較":"加入比較"}">
        ${inCompare ? "📊 比較中" : "＋ 比較"}
      </button>
    `;

    // 點卡片主體開啟詳情（排除按鈕）
    card.addEventListener("click", e => {
      if (e.target.closest(".card-fav-btn") || e.target.closest(".card-compare-btn")) return;
      openDetail(food.code);
    });

    // 愛心按鈕
    card.querySelector(".card-fav-btn").addEventListener("click", e => {
      e.stopPropagation();
      toggleFavorite(food.code, e.currentTarget);
    });

    // 比較按鈕
    card.querySelector(".card-compare-btn").addEventListener("click", e => {
      e.stopPropagation();
      toggleCompareFromCard(food.code, e.currentTarget, card);
    });

    frag.appendChild(card);
  });

  foodGrid.appendChild(frag);

  if (foods.length > 200) {
    const more = document.createElement("div");
    more.style.cssText = "grid-column:1/-1;text-align:center;color:var(--gray-400);font-size:.82rem;padding:12px";
    more.textContent = `顯示前 200 筆，共 ${foods.length} 筆。請縮小搜尋範圍查看更多。`;
    foodGrid.appendChild(more);
  }
}

// ===== 詳情 Modal =====
async function openDetail(code) {
  // 若當前搜尋框有字串，記錄此搜尋詞
  const rawSearch = searchInput.value.trim();
  if (rawSearch) addSearchHistory(rawSearch);

  modalFoodName.textContent = "載入中…";
  modalFoodEn.textContent   = "";
  modalFoodAlias.textContent= "";
  modalMeta.innerHTML       = "";
  nutrientTabs.innerHTML    = "";
  nutrientContent.innerHTML = `<div style="padding:40px;text-align:center;color:var(--gray-400)">資料載入中…</div>`;
  modalOverlay.style.display = "flex";
  document.body.style.overflow = "hidden";

  const food = await ensureFoodData(code);
  if (!food) { nutrientContent.innerHTML = "資料讀取失敗"; return; }
  currentFood = food;

  // 預設 tab：一般成分
  activeNutrientTab = "一般成分";

  modalFoodName.textContent  = food.name;
  modalFoodEn.textContent    = food.en_name;
  modalFoodAlias.textContent = food.alias ? `別名：${food.alias}` : "";

  modalMeta.innerHTML = `
    <span>📂 ${food.category}</span>
    <span>🔢 ${food.code}</span>
    ${food.waste !== null ? `<span>🗑️ 廢棄率 ${food.waste}%</span>` : ""}
    ${food.desc ? `<span title="${food.desc}">📝 ${food.desc.slice(0,50)}${food.desc.length>50?"…":""}</span>` : ""}
  `;

  // 計算模式重置
  calcMode = "100g";
  document.querySelectorAll(".calc-mode-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.mode === "100g");
  });
  calcInputWrap.style.display = "none";

  syncFavModalBtn();
  updateCompareBtn();
  buildNutrientTabs(food);
  renderNutrientTable(food, activeNutrientTab);
}

function closeDetail() {
  modalOverlay.style.display = "none";
  document.body.style.overflow = "";
  currentFood = null;
}

modalClose.addEventListener("click", closeDetail);
modalOverlay.addEventListener("click", e => { if (e.target === modalOverlay) closeDetail(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") closeDetail(); });

// ===== 計算模式 =====
document.querySelectorAll(".calc-mode-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    calcMode = btn.dataset.mode;
    document.querySelectorAll(".calc-mode-btn").forEach(b => b.classList.toggle("active", b === btn));
    calcInputWrap.style.display = calcMode === "custom" ? "flex" : "none";
    if (currentFood && activeNutrientTab) renderNutrientTable(currentFood, activeNutrientTab);
  });
});
calcGrams.addEventListener("input", () => {
  if (currentFood && activeNutrientTab) renderNutrientTable(currentFood, activeNutrientTab);
});

// ===== 分析項分類標籤 =====
function buildNutrientTabs(food) {
  nutrientTabs.innerHTML = "";
  // 「一般成分」永遠顯示（含礦物質）
  const showCats = CATEGORY_ORDER.filter(c => c === "一般成分" || food.nutrients[c]);

  showCats.forEach(cat => {
    const btn = document.createElement("button");
    btn.className = "ntab" + (cat === activeNutrientTab ? " active" : "");
    btn.textContent = cat;
    btn.addEventListener("click", () => {
      activeNutrientTab = cat;
      document.querySelectorAll(".ntab").forEach(b => b.classList.toggle("active", b === btn));
      renderNutrientTable(food, cat);
    });
    nutrientTabs.appendChild(btn);
  });
}

// ===== 渲染營養成分表 =====
function renderNutrientTable(food, cat) {
  const grams = calcMode === "custom" ? parseFloat(calcGrams.value) || 100 : 100;
  const ratio  = grams / 100;

  // 「一般成分」合併礦物質
  let items;
  let sections; // [{title, items}]

  if (cat === "一般成分") {
    const general  = food.nutrients["一般成分"] || [];
    const minerals = food.nutrients["礦物質"]   || [];

    // 排序一般成分，並過濾隱藏項目
    const sortedGeneral = [
      ...GENERAL_ORDER.map(name => general.find(i => i.name === name)).filter(Boolean),
      ...general.filter(i => !GENERAL_ORDER.includes(i.name) && !HIDDEN_ITEMS.has(i.name))
    ];

    // 排序礦物質：鈣鈉鉀磷優先
    const sortedMinerals = [
      ...MINERAL_ORDER.map(name => minerals.find(i => i.name === name)).filter(Boolean),
      ...minerals.filter(i => !MINERAL_ORDER.includes(i.name))
    ];

    sections = [
      { title: null, items: sortedGeneral },
      { title: "⚗️ 礦物質", items: sortedMinerals },
    ];
    items = [...sortedGeneral, ...sortedMinerals];
  } else {
    items = (food.nutrients[cat] || []).filter(i => !HIDDEN_ITEMS.has(i.name));
    sections = [{ title: null, items }];
  }

  const hasDV = items.some(i => DAILY_VALUES[i.name] || CUSTOM_THRESHOLDS[i.name]);
  const customCol = calcMode === "custom";

  let html = "";
  if (hasDV) {
    html += `<div class="dv-notice">
      📊 進度條顯示佔每日建議量 (DV) 百分比。<span style="color:var(--orange);font-weight:600">橘字</span>偏高，<span style="color:var(--red);font-weight:600">紅字</span>超標。
    </div>`;
  }

  html += `<table class="nutrient-table">
    <thead>
      <tr>
        <th class="th-name">營養成分</th>
        <th class="th-unit">單位</th>
        ${customCol ? `<th class="th-custom">每 ${grams}g</th>` : ""}
        <th class="th-100g">每 100g</th>
        ${hasDV ? `<th class="th-dv">建議標準</th>` : ""}
      </tr>
    </thead>
    <tbody>`;

  sections.forEach(sec => {
    if (sec.title && sec.items.length > 0) {
      html += `<tr class="section-row"><td colspan="${2 + (customCol?1:0) + (hasDV?1:0)}">${sec.title}</td></tr>`;
    }
    sec.items.forEach(item => {
      const val100   = item.per100g;
      const valCalc  = val100 !== null ? val100 * ratio : null;
      const dv       = DAILY_VALUES[item.name];
      const isNull   = val100 === null;

      // 計算顯示值（依自訂克數換算後的值）
      const dispVal  = calcMode === "custom" ? valCalc : val100;

      // ── 判斷色彩 ──
      // 優先使用自訂閾值，其次使用 DV %
      const customColor = getCustomColor(item.name, dispVal);
      let colorClass = "";
      let isWarn = false, isOver = false;
      let pct = null;

      if (customColor) {
        // 自訂閾值
        if (customColor === "warn")   { isWarn = true; colorClass = "warn-dv"; }
        if (customColor === "danger") { isOver = true; colorClass = "over-dv"; }
      }
      
      if (dv && dispVal !== null) {
        // DV % 判斷
        pct = (dispVal / dv.dv) * 100;
        if (!customColor) {
          if (pct > 100)      { isOver = true; colorClass = "over-dv"; }
          else if (pct > 60)  { isWarn = true; colorClass = "warn-dv"; }
        }
      }

      const fmtVal = v => {
        if (v === null) return "—";
        return v % 1 === 0 ? v.toLocaleString() : parseFloat(v.toFixed(2)).toLocaleString();
      };

      const rowClass = isNull ? "null-val" : colorClass;

      // ── DV / 建議標準比例尺欄 ──
      let dvHtml = "";
      if (hasDV) {
        if (dv && dispVal !== null) {
          const barPct   = Math.min(pct, 100);
          let barClass = "";
          if (customColor) {
            barClass = customColor === "ok" ? "low" : customColor === "warn" ? "medium" : "high";
          } else {
            barClass = pct < 60 ? "low" : pct < 100 ? "medium" : "high";
          }

          dvHtml = `<td class="dv-cell">
            <div class="dv-wrap">
              <div class="dv-bar-bg"><div class="dv-bar ${barClass}" style="width:${barPct}%"></div></div>
              <span class="dv-pct${isOver?" over-dv":isWarn?" warn-dv":""}">${pct.toFixed(0)}%</span>
            </div>
          </td>`;
        } else {
          dvHtml = "<td class='dv-cell' style='color:var(--gray-300);text-align:center;'>—</td>";
        }
      }

      html += `<tr>
        <td class="${rowClass}">${item.name}</td>
        <td>${item.unit||"—"}</td>
        ${customCol ? `<td class="${rowClass}">${isNull?"—":fmtVal(valCalc)}</td>` : ""}
        <td class="${rowClass}">${isNull?"—":fmtVal(val100)}</td>
        ${dvHtml}
      </tr>`;
    });
  });

  html += "</tbody></table>";

  // 鉀和磷的臨床顏色標準（縮小置於表格底部）
  const hasKP = cat === "一般成分" || (food.nutrients[cat] && food.nutrients[cat].some(i => i.name === "鉀" || i.name === "磷"));
  if (hasKP) {
    html += `
      <div class="nutrient-table-footer">
        <div class="ntf-item">
          <span class="ntf-badge">鉀 (K) 參考</span>
          <span class="ntf-val ntf-ok">≤100mg 正常</span>
          <span class="ntf-sep">·</span>
          <span class="ntf-val ntf-warn">101~200mg 偏高</span>
          <span class="ntf-sep">·</span>
          <span class="ntf-val ntf-danger">&gt;200mg 過高</span>
        </div>
        <div class="ntf-item">
          <span class="ntf-badge">磷 (P) 參考</span>
          <span class="ntf-val ntf-ok">≤100mg 正常</span>
          <span class="ntf-sep">·</span>
          <span class="ntf-val ntf-warn">101~250mg 偏高</span>
          <span class="ntf-sep">·</span>
          <span class="ntf-val ntf-danger">&gt;250mg 過高</span>
        </div>
      </div>
    `;
  }

  nutrientContent.innerHTML = html;
}

// ===== 收藏按鈕（Modal）=====
btnFavModal.addEventListener("click", () => {
  if (!currentFood) return;
  toggleFavorite(currentFood.code, btnFavModal);
  // 同步卡片上的愛心
  const cardBtn = document.querySelector(`.card-fav-btn[data-code="${currentFood.code}"]`);
  if (cardBtn) {
    const on = favorites.has(currentFood.code);
    cardBtn.textContent = on ? "❤️" : "🤍";
    cardBtn.classList.toggle("fav-on", on);
  }
});

// ===== 比較功能 =====

async function toggleCompareFromCard(code, btn, card) {
  const idx = compareList.findIndex(f => f.code === code);
  if (idx !== -1) {
    // 移出
    compareList.splice(idx, 1);
    btn.textContent = "＋ 比較";
    btn.classList.remove("active");
    card.classList.remove("in-compare");
    updateCompareBar();
    updateCompareBadge();
  } else {
    if (compareList.length >= 3) { showToast("比較最多 3 種食品"); return; }
    const food = await ensureFoodData(code);
    if (!food) return;
    compareList.push(food);
    btn.textContent = "📊 比較中";
    btn.classList.add("active");
    card.classList.add("in-compare");
    updateCompareBar();
    updateCompareBadge();
  }
}

function updateCompareBtn() {
  if (!currentFood) return;
  const inList = compareList.some(f => f.code === currentFood.code);
  if (compareList.length >= 3 && !inList) {
    btnCompareAdd.disabled = true;
    btnCompareAdd.textContent = "⛔ 已達上限 3 種";
  } else if (inList) {
    btnCompareAdd.disabled = false;
    btnCompareAdd.textContent = "📊 已加入比較";
    btnCompareAdd.classList.add("in-compare");
  } else {
    btnCompareAdd.disabled = false;
    btnCompareAdd.textContent = "➕ 加入比較";
    btnCompareAdd.classList.remove("in-compare");
  }
}

btnCompareAdd.addEventListener("click", () => {
  if (!currentFood) return;
  const idx = compareList.findIndex(f => f.code === currentFood.code);
  if (idx !== -1) {
    // 移出
    compareList.splice(idx, 1);
    btnCompareAdd.textContent = "➕ 加入比較";
    btnCompareAdd.classList.remove("in-compare");
  } else {
    if (compareList.length >= 3) return;
    compareList.push(currentFood);
    btnCompareAdd.textContent = "📊 已加入比較";
    btnCompareAdd.classList.add("in-compare");
  }
  updateCompareBar();
  updateCompareBadge();
  syncCardCompareState(currentFood.code);
});

function syncCardCompareState(code) {
  const card = document.querySelector(`.food-card[data-code="${code}"]`);
  if (!card) return;
  const inList = compareList.some(f => f.code === code);
  const btn    = card.querySelector(".card-compare-btn");
  if (btn) {
    btn.textContent = inList ? "📊 比較中" : "＋ 比較";
    btn.classList.toggle("active", inList);
  }
  card.classList.toggle("in-compare", inList);
}

// ===== 底部比較列 =====
function updateCompareBar() {
  if (compareList.length === 0) {
    compareBar.classList.remove("show");
    return;
  }
  compareBar.classList.add("show");
  compareBarList.innerHTML = compareList.map(f => `
    <div class="cbar-item">
      <span class="cbar-name">${f.name}</span>
      <button class="cbar-remove" data-code="${f.code}" title="移除">✕</button>
    </div>
  `).join("");

  compareBarList.querySelectorAll(".cbar-remove").forEach(btn => {
    btn.addEventListener("click", () => {
      const code = btn.dataset.code;
      compareList = compareList.filter(f => f.code !== code);
      updateCompareBar();
      updateCompareBadge();
      syncCardCompareState(code);
      if (currentFood && currentFood.code === code) updateCompareBtn();
      buildCompareUI();
    });
  });
}

compareBarClear.addEventListener("click", () => {
  const codes = compareList.map(f => f.code);
  compareList = [];
  updateCompareBar();
  updateCompareBadge();
  codes.forEach(syncCardCompareState);
  buildCompareUI();
  if (currentFood) updateCompareBtn();
});

compareBarOpen.addEventListener("click", () => {
  closeDetail();
  // 切到比較 tab
  document.querySelector('.tab-btn[data-tab="compare"]').click();
  buildCompareUI();
});

function updateCompareBadge() {
  compareBadge.textContent = compareList.length;
  compareBadge.style.display = compareList.length > 0 ? "inline-block" : "none";
}

// ===== 比較表格 =====
function buildCompareUI() {
  if (compareList.length === 0) {
    compareHint.style.display = "block";
    compareTableWrap.style.display = "none";
    return;
  }
  compareHint.style.display = "none";
  compareTableWrap.style.display = "block";

  // 建立分類下拉
  const prev = compareCategory.value;
  compareCategory.innerHTML = `<option value="__overview__">⭐ 重點概覽</option>`;
  CATEGORY_ORDER.forEach(cat => {
    if (compareList.some(f => f.nutrients && f.nutrients[cat])) {
      const opt = document.createElement("option");
      opt.value = cat; opt.textContent = cat;
      compareCategory.appendChild(opt);
    }
  });
  if (prev) compareCategory.value = prev;
  if (!compareCategory.value) compareCategory.value = "__overview__";

  renderCompareTable();
}

compareCategory.addEventListener("change", renderCompareTable);

clearCompare.addEventListener("click", () => {
  const codes = compareList.map(f => f.code);
  compareList = [];
  updateCompareBar();
  updateCompareBadge();
  codes.forEach(syncCardCompareState);
  buildCompareUI();
  if (currentFood) updateCompareBtn();
});

function renderCompareTable() {
  const cat = compareCategory.value;
  if (!cat || compareList.length === 0) return;

  // 重點概覽：一般成分 + 鈣鈉鉀磷
  const OVERVIEW_ITEMS = ["修正熱量","熱量","粗蛋白","粗脂肪","飽和脂肪","總碳水化合物","膳食纖維","鈣","鈉","鉀","磷","鎂","鐵"];

  let sectionList; // [{title, names}]
  if (cat === "__overview__") {
    sectionList = [{ title: null, names: OVERVIEW_ITEMS }];
  } else if (cat === "一般成分") {
    const genNames = [...new Set(compareList.flatMap(f => (f.nutrients["一般成分"]||[]).map(i=>i.name)))];
    const minNames = [...new Set(compareList.flatMap(f => (f.nutrients["礦物質"]||[]).map(i=>i.name)))];
    const sortedMin = [...MINERAL_ORDER.filter(n=>minNames.includes(n)), ...minNames.filter(n=>!MINERAL_ORDER.includes(n))];
    sectionList = [
      { title: null, names: genNames },
      { title: "⚗️ 礦物質", names: sortedMin },
    ];
  } else {
    const names = [...new Set(compareList.flatMap(f => (f.nutrients[cat]||[]).map(i=>i.name)))];
    sectionList = [{ title: null, names }];
  }

  // 表頭
  let html = `<thead><tr>
    <th>營養成分</th>
    ${compareList.map(f => `<th>
      <div class="cth-name">${f.name}</div>
      <div class="cth-cat">${f.category}</div>
      <button class="compare-remove" data-code="${f.code}">✕ 移除</button>
    </th>`).join("")}
  </tr></thead><tbody>`;

  const getNutrient = (food, name) => {
    for (const catKey of Object.keys(food.nutrients)) {
      const found = (food.nutrients[catKey]||[]).find(i=>i.name===name);
      if (found) return found;
    }
    return null;
  };

  sectionList.forEach(sec => {
    if (sec.title) {
      html += `<tr class="section-row"><td colspan="${1+compareList.length}">${sec.title}</td></tr>`;
    }
    sec.names.forEach(name => {
      const vals = compareList.map(f => {
        const item = getNutrient(f, name);
        return item ? item.per100g : null;
      });
      const units = compareList.map(f => {
        const item = getNutrient(f, name);
        return item ? item.unit : "";
      });
      const unit = units.find(u => u) || "";
      const numVals = vals.filter(v => v !== null && v > 0);
      const maxVal  = numVals.length > 1 ? Math.max(...numVals) : null;

      const dv = DAILY_VALUES[name];

      html += `<tr><td class="cmp-item-name">${name}${unit?`<span class="cmp-unit">${unit}</span>`:""}`;
      if (dv) html += `<span class="cmp-dv-ref">DV ${dv.dv}${dv.unit}</span>`;
      html += `</td>`;

      vals.forEach((v, idx) => {
        const isBest = v !== null && v === maxVal;
        const pct    = (dv && v !== null) ? (v / dv.dv) * 100 : null;
        const isOver = pct !== null && pct > 100;
        const fmt    = v === null ? "—" : (v%1===0 ? v.toLocaleString() : parseFloat(v.toFixed(2)).toLocaleString());
        let cls = "";
        if (isBest) cls = "best";
        if (isOver) cls = "over-dv";

        let barHtml = "";
        if (dv && v !== null) {
          const bp = Math.min(pct, 100);
          const bc = pct < 50 ? "low" : pct < 100 ? "medium" : "high";
          barHtml = `<div class="cmp-bar-wrap"><div class="dv-bar-bg" style="height:4px"><div class="dv-bar ${bc}" style="width:${bp}%"></div></div><span class="cmp-pct${isOver?" over-dv":""}">${pct.toFixed(0)}%</span></div>`;
        }
        html += `<td><span class="compare-val ${cls}">${fmt}</span>${barHtml}</td>`;
      });
      html += `</tr>`;
    });
  });

  html += "</tbody>";
  compareTable.innerHTML = html;

  compareTable.querySelectorAll(".compare-remove").forEach(btn => {
    btn.addEventListener("click", () => {
      const code = btn.dataset.code;
      compareList = compareList.filter(f => f.code !== code);
      updateCompareBar();
      updateCompareBadge();
      syncCardCompareState(code);
      buildCompareUI();
    });
  });
}

// ===== Tab 切換 =====
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const tab = btn.dataset.tab;
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b===btn));
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.toggle("active", p.id===`tab-${tab}`));
    if (tab === "compare") buildCompareUI();
  });
});

// ===== Toast =====
function showToast(msg) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add("show"), 10);
  setTimeout(() => { t.classList.remove("show"); setTimeout(()=>t.remove(), 300); }, 2500);
}

// ===== Loading =====
let loadingEl = null;
function showLoading(msg) {
  if (loadingEl) return;
  loadingEl = document.createElement("div");
  loadingEl.className = "loading-overlay";
  loadingEl.innerHTML = `<div class="loading-spinner"></div><div class="loading-text">${msg}</div>`;
  document.body.appendChild(loadingEl);
}
function hideLoading() {
  if (loadingEl) { loadingEl.remove(); loadingEl = null; }
}

// ===== 啟動 =====
init();
