/**
 * functions/api/report-bug.js
 * Cloudflare Pages Functions - 安全代理轉發 Bug 回報至 bug-center
 * 避免金鑰暴露在前端 JavaScript 與 Git 歷史紀錄中
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const payload = await request.json().catch(() => ({}));
    const apiKey = env.BUG_CENTER_API_KEY || "";

    if (!apiKey) {
      return new Response(JSON.stringify({
        success: false,
        message: "後端尚未在 Cloudflare Pages 配置 BUG_CENTER_API_KEY 環境變數"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    const title = (payload.title || "").trim();
    const description = (payload.description || "").trim();
    const email = (payload.email || "").trim();

    if (!title || !description) {
      return new Response(JSON.stringify({
        success: false,
        message: "主旨與詳細描述為必填"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 安全轉發至集中式 Bug 回報中心
    const response = await fetch("https://bug-center.pages.dev/api/reports", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Bug-API-Key": apiKey
      },
      body: JSON.stringify({
        app_name: payload.app_name || "台灣食品營養成分資料庫 (food.ating123.com)",
        title: title,
        description: description,
        email: email,
        meta: {
          url: request.headers.get("Referer") || "https://food.ating123.com/",
          ip: request.headers.get("CF-Connecting-IP") || "Unknown",
          user_agent: request.headers.get("User-Agent") || "Unknown",
          timestamp: new Date().toISOString()
        }
      })
    });

    const result = await response.json().catch(() => ({}));
    return new Response(JSON.stringify(result), {
      status: response.status,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: `轉發失敗: ${error.message}`
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
