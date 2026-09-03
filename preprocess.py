#!/usr/bin/env python3
"""
preprocess.py v2
輸入：20_5.json
輸出：
  foods_index.json     — 輕量搜尋索引（含 kcal），用於全域搜尋
  version.json         — 版本資訊，網站可比對版本
  data/{分類}.json     — 各分類完整營養資料（按需懶載入）

升級方式：
  1. 替換 20_5.json 為新版本
  2. 執行 python3 preprocess.py
  3. git add . && git commit -m "升級至 vXX" && git push
  → Cloudflare Pages 自動部署
"""

import json, os, datetime, sys
from collections import defaultdict

INPUT_FILE   = "20_5.json"
INDEX_FILE   = "foods_index.json"
VERSION_FILE = "version.json"
DATA_DIR     = "data"

# ── 版本號（可透過 CLI 傳入或預設） ──
VERSION = "20.5"

if len(sys.argv) > 1:
    INPUT_FILE = sys.argv[1]
if len(sys.argv) > 2:
    VERSION = sys.argv[2]
elif "20_5" not in INPUT_FILE:
    # 嘗試從檔名解析版本號，例如 20_6.json -> 20.6
    base = os.path.splitext(os.path.basename(INPUT_FILE))[0]
    if "_" in base:
        VERSION = base.replace("_", ".")

def clean_value(v):
    """清理欄位值：去除空白，轉換數字，null 回傳 None"""
    if v is None: return None
    s = str(v).strip()
    if not s or s.lower() == "null": return None
    try: return float(s)
    except: return s

def get_kcal(items):
    """從分析項列表中取得熱量（優先取修正熱量）"""
    kcal = None
    for item in items:
        if item["分析項分類"] != "一般成分": continue
        if item["分析項"] not in ("熱量", "修正熱量"): continue
        v = clean_value(item["每100克含量"])
        if v is not None:
            if kcal is None or item["分析項"] == "修正熱量":
                kcal = round(v)
    return kcal

def get_mineral(items, name):
    """從分析項列表中取得指定礦物質每100克含量"""
    for item in items:
        if item["分析項分類"] == "礦物質" and item["分析項"] == name:
            v = clean_value(item["每100克含量"])
            if v is not None and isinstance(v, (int, float)):
                return round(v, 1) if v % 1 != 0 else int(v)
    return None

def main():
    os.makedirs(DATA_DIR, exist_ok=True)

    print("正在讀取資料...", flush=True)
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        raw = json.load(f)
    print(f"共 {len(raw):,} 筆原始資料，開始整理...", flush=True)

    # ── 按整合編號分組 ──
    grouped = defaultdict(list)
    for item in raw:
        grouped[item["整合編號"]].append(item)
    print(f"共 {len(grouped):,} 種食品", flush=True)

    # ── 按分類再分組，同時建立索引 ──
    by_category = defaultdict(dict)
    index = []

    for code, items in grouped.items():
        first  = items[0]
        kcal   = get_kcal(items)
        k_val  = get_mineral(items, "鉀")
        p_val  = get_mineral(items, "磷")
        cat    = first["食品分類"]

        # 索引資料（輕量，含 kcal, k, p 供卡片顯示）
        index.append({
            "code":     code,
            "name":     first["樣品名稱"],
            "alias":    first["俗名"] or "",
            "en_name":  first["樣品英文名稱"] or "",
            "category": cat,
            "desc":     first["內容物描述"] or "",
            "waste":    clean_value(first["廢棄率"]),
            "kcal":     kcal,
            "k":        k_val,
            "p":        p_val,
        })

        # 完整營養資料（按分析項分類整理）
        nutrients = defaultdict(list)
        for item in items:
            nutrients[item["分析項分類"]].append({
                "name":    item["分析項"],
                "unit":    item["含量單位"] or "",
                "per100g": clean_value(item["每100克含量"]),
            })

        by_category[cat][code] = {
            "code":      code,
            "name":      first["樣品名稱"],
            "alias":     first["俗名"] or "",
            "en_name":   first["樣品英文名稱"] or "",
            "category":  cat,
            "desc":      first["內容物描述"] or "",
            "waste":     clean_value(first["廢棄率"]),
            "kcal":      kcal,
            "nutrients": dict(nutrients),
        }

    # ── 排序索引 ──
    index.sort(key=lambda x: (x["category"], x["name"]))

    # ── 寫出索引 ──
    print(f"\n寫出 {INDEX_FILE}...", flush=True)
    with open(INDEX_FILE, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, separators=(",", ":"))
    idx_mb = os.path.getsize(INDEX_FILE) / 1024 / 1024
    print(f"  → {idx_mb:.2f} MB", flush=True)

    # ── 寫出各分類 ──
    print(f"\n寫出 data/ 目錄（{len(by_category)} 個分類）...", flush=True)
    cat_stats = {}
    total_data_mb = 0
    for cat in sorted(by_category.keys()):
        foods = by_category[cat]
        # 檔名使用分類名稱（中文，Cloudflare Pages 支援 UTF-8 路徑）
        filename = os.path.join(DATA_DIR, f"{cat}.json")
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(foods, f, ensure_ascii=False, separators=(",", ":"))
        mb = os.path.getsize(filename) / 1024 / 1024
        total_data_mb += mb
        cat_stats[cat] = {"count": len(foods), "mb": round(mb, 2)}
        print(f"  {cat}: {len(foods)} 種食品，{mb:.2f} MB", flush=True)

    # ── 寫出版本資訊 ──
    version_info = {
        "version":      VERSION,
        "generated":    datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
        "source":       INPUT_FILE,
        "total_foods":  len(index),
        "categories":   sorted(by_category.keys()),
        "data_files":   {cat: f"data/{cat}.json" for cat in sorted(by_category.keys())},
        "stats":        cat_stats,
    }
    with open(VERSION_FILE, "w", encoding="utf-8") as f:
        json.dump(version_info, f, ensure_ascii=False, indent=2)
    print(f"\n寫出 {VERSION_FILE}", flush=True)

    # ── 移除舊的大檔（若存在）──
    if os.path.exists("foods_data.json"):
        os.remove("foods_data.json")
        print("已移除舊版 foods_data.json", flush=True)

    # ── 摘要 ──
    print(f"""
✅ 完成！
   foods_index.json : {idx_mb:.2f} MB（含全部 {len(index):,} 種食品 + kcal）
   data/ 目錄       : {len(by_category)} 個分類檔，合計 {total_data_mb:.1f} MB
   version.json     : 版本 {VERSION}，生成時間 {version_info['generated']}
""", flush=True)

if __name__ == "__main__":
    main()
