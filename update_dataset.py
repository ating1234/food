#!/usr/bin/env python3
"""
update_dataset.py
衛生福利部食品藥物管理署（TFDA）食品營養成分資料庫 - 自動更新與版本連動程式

功能：
1. 查詢政府資料開放平台 (data.gov.tw) 或 TFDA OpenData 最新資料集
2. 比對本地現有資料雜湊 (Hash) 與版本
3. 若有新版資料，自動下載並調用 preprocess.py 重新生成索引
4. 自動同步更新全站（HTML / LLMs / Version JSON）中的版本數字
"""

import os
import sys
import json
import hashlib
import re
import urllib.request
import urllib.error
import datetime

# 政府開放資料平台 API 端點 (資料集 14197: 食品營養成分資料庫)
DATASET_API_URL = "https://data.gov.tw/api/v2/rest/dataset/14197"
# 備用直接下載點 (TFDA 食品營養成分資料庫 JSON)
FALLBACK_DOWNLOAD_URL = "https://data.fda.gov.tw/opendata/exportDataList.do?method=ExportData&ContentType=json&DatasetId=43"

VERSION_FILE = "version.json"
CURRENT_LOCAL_DATA = "20_5.json"

def get_current_version_info():
    if os.path.exists(VERSION_FILE):
        try:
            with open(VERSION_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {"version": "20.5", "generated": "2026-09-03"}

def calculate_sha256(filepath):
    if not os.path.exists(filepath):
        return None
    sha256 = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(8192):
            sha256.update(chunk)
    return sha256.hexdigest()

def update_static_files_version(new_version):
    """同步替換靜態文件中的版本數字"""
    print(f"🔄 正在同步更新靜態文件版本號至：第 {new_version} 版 ...")
    
    # 1. 更新 index.html
    if os.path.exists("index.html"):
        with open("index.html", "r", encoding="utf-8") as f:
            content = f.read()
        # 替換如 TFDA 20.5 或 第 20.5 版
        content = re.sub(r"TFDA\s*\d+\.\d+", f"TFDA {new_version}", content)
        content = re.sub(r"第\s*\d+\.\d+\s*版", f"第 {new_version} 版", content)
        with open("index.html", "w", encoding="utf-8") as f:
            f.write(content)
        print("  ✓ index.html 已同步")

    # 2. 更新 llms.txt
    if os.path.exists("llms.txt"):
        with open("llms.txt", "r", encoding="utf-8") as f:
            content = f.read()
        content = re.sub(r"第\s*\d+\.\d+\s*版", f"第 {new_version} 版", content)
        with open("llms.txt", "w", encoding="utf-8") as f:
            f.write(content)
        print("  ✓ llms.txt 已同步")

    # 3. 更新 llms-full.txt
    if os.path.exists("llms-full.txt"):
        with open("llms-full.txt", "r", encoding="utf-8") as f:
            content = f.read()
        content = re.sub(r"第\s*\d+\.\d+\s*版", f"第 {new_version} 版", content)
        with open("llms-full.txt", "w", encoding="utf-8") as f:
            f.write(content)
        print("  ✓ llms-full.txt 已同步")

    # 4. 更新 README.md
    if os.path.exists("README.md"):
        with open("README.md", "r", encoding="utf-8") as f:
            content = f.read()
        content = re.sub(r"第\s*\d+\.\d+\s*版", f"第 {new_version} 版", content)
        with open("README.md", "w", encoding="utf-8") as f:
            f.write(content)
        print("  ✓ README.md 已同步")

def main():
    current_info = get_current_version_info()
    current_version = current_info.get("version", "20.5")
    print(f"📌 當前專案資料版本：第 {current_version} 版 (生成於 {current_info.get('generated', '未知')})")

    # 檢查是否指定了強制測試更新檔案 (例如本地測試: python3 update_dataset.py local_test.json 20.6)
    if len(sys.argv) > 1 and os.path.exists(sys.argv[1]):
        test_file = sys.argv[1]
        target_version = sys.argv[2] if len(sys.argv) > 2 else "20.6"
        print(f"🧪 偵測到本地指定檔案：{test_file}，版本：{target_version}")
        os.system(f"python3 preprocess.py {test_file} {target_version}")
        update_static_files_version(target_version)
        print("✅ 本地測試更新完成！")
        return

    # 嘗試向官方 API 查詢
    print("🌐 正在連線政府資料開放平台檢查最新食品營養成分資料集...")
    download_url = None
    remote_version = None

    try:
        req = urllib.request.Request(
            DATASET_API_URL, 
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
        )
        with urllib.request.urlopen(req, timeout=15) as res:
            data = json.loads(res.read().decode("utf-8"))
            if data.get("success") and "result" in data:
                distribution = data["result"].get("distribution", [])
                for dist in distribution:
                    if dist.get("format", "").upper() == "JSON":
                        download_url = dist.get("downloadURL")
                        title = dist.get("resourceDescription", "") + " " + data["result"].get("title", "")
                        # 嘗試從標題中解析出版本號，如 20.6
                        match = re.search(r"(\d+\.\d+)", title)
                        if match:
                            remote_version = match.group(1)
                        break
    except Exception as e:
        print(f"⚠️ API 查詢失敗 ({e})，使用官方直連下載點嘗試比對...")

    if not download_url:
        download_url = FALLBACK_DOWNLOAD_URL

    print(f"📥 下載最新資料比對中 ({download_url})...")
    temp_download = "latest_raw_download.json"

    try:
        req = urllib.request.Request(
            download_url, 
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
        )
        with urllib.request.urlopen(req, timeout=45) as res:
            content = res.read()
            # 簡單驗證是否為有效 JSON
            parsed = json.loads(content.decode("utf-8"))
            if not isinstance(parsed, list) or len(parsed) < 1000:
                print("❌ 下載資料格式異常（非預期食品列表），中止更新。")
                return

            with open(temp_download, "wb") as f:
                f.write(content)
    except Exception as e:
        print(f"⚠️ 資料下載失敗或暫時無法連線：{e}")
        if os.path.exists(temp_download):
            os.remove(temp_download)
        print("✅ 保持目前資料版本，退出更新檢查。")
        return

    # 比對 SHA-256 Hash
    current_hash = calculate_sha256(CURRENT_LOCAL_DATA)
    new_hash = calculate_sha256(temp_download)

    if current_hash and current_hash == new_hash:
        print(f"✨ 官方資料與本地資料完全一致 (Hash: {new_hash[:12]}...)，目前已是最新版本！無需更新。")
        os.remove(temp_download)
        # 寫出 GitHub Actions Output (無更新)
        if "GITHUB_OUTPUT" in os.environ:
            with open(os.environ["GITHUB_OUTPUT"], "a") as gh_out:
                gh_out.write("has_update=false\n")
        return

    print("🎉 發現新版官方食品營養成分資料！開始進行全自動重構與版本連動...")

    # 計算新版版本號（若無遠端版本號，自動加 0.1）
    if not remote_version:
        try:
            parts = current_version.split(".")
            remote_version = f"{parts[0]}.{int(parts[1]) + 1}"
        except Exception:
            remote_version = "最新版"

    print(f"🚀 新版本號判定為：第 {remote_version} 版")

    # 覆蓋現有資料檔
    if os.path.exists(CURRENT_LOCAL_DATA):
        os.remove(CURRENT_LOCAL_DATA)
    os.rename(temp_download, CURRENT_LOCAL_DATA)

    # 執行 preprocess.py 重新產生 foods_index.json, data/*.json, version.json
    ret = os.system(f"python3 preprocess.py {CURRENT_LOCAL_DATA} {remote_version}")
    if ret != 0:
        print("❌ 預處理過程發生錯誤！")
        sys.exit(1)

    # 同步更新 HTML/LLMs/README 靜態標籤版本號
    update_static_files_version(remote_version)

    # 寫出 GitHub Actions Output (有更新)
    if "GITHUB_OUTPUT" in os.environ:
        with open(os.environ["GITHUB_OUTPUT"], "a") as gh_out:
            gh_out.write("has_update=true\n")
            gh_out.write(f"new_version={remote_version}\n")

    print(f"\n🎉 恭喜！資料庫與全站版本數字已全數升級至 第 {remote_version} 版！")

if __name__ == "__main__":
    main()
