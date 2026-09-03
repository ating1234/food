<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0" 
  xmlns:html="http://www.w3.org/TR/REC-html40"
  xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml" lang="zh-TW">
      <head>
        <title>XML Sitemap - 台灣食品營養成分資料庫</title>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <style type="text/css">
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #2d3748;
            background-color: #f7fafc;
            margin: 0;
            padding: 40px 20px;
          }
          .container {
            max-width: 900px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
            padding: 30px 40px;
            border: 1px solid #e2e8f0;
          }
          h1 {
            color: #1a7f5a;
            font-size: 24px;
            margin-top: 0;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 10px;
          }
          p.desc {
            color: #718096;
            font-size: 14px;
            margin-bottom: 24px;
            line-height: 1.6;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
          }
          th {
            background-color: #f0fdf4;
            color: #166534;
            text-align: left;
            padding: 12px 16px;
            border-bottom: 2px solid #bbf7d0;
            font-weight: 600;
          }
          td {
            padding: 12px 16px;
            border-bottom: 1px solid #edf2f7;
          }
          tr:hover td {
            background-color: #f8fafc;
          }
          a {
            color: #1a7f5a;
            text-decoration: none;
            font-weight: 500;
          }
          a:hover {
            text-decoration: underline;
          }
          .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            background: #e6fffa;
            color: #047481;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🥗 XML 網站地圖 (Sitemap)</h1>
          <p class="desc">
            本 XML 網站地圖提供給 Google、Bing、Applebot 等搜尋引擎與 AI 爬蟲檢索收錄。<br/>
            網站：<strong><a href="https://food.ating123.com/">台灣食品營養成分資料庫 (food.ating123.com)</a></strong>
          </p>
          <table>
            <thead>
              <tr>
                <th>網址 (URL)</th>
                <th>更新頻率</th>
                <th>權重 (Priority)</th>
                <th>最後修改日期</th>
              </tr>
            </thead>
            <tbody>
              <xsl:for-each select="sitemap:urlset/sitemap:url">
                <tr>
                  <td>
                    <a href="{sitemap:loc}"><xsl:value-of select="sitemap:loc"/></a>
                  </td>
                  <td><span class="badge"><xsl:value-of select="sitemap:changefreq"/></span></td>
                  <td><xsl:value-of select="sitemap:priority"/></td>
                  <td><xsl:value-of select="sitemap:lastmod"/></td>
                </tr>
              </xsl:for-each>
            </tbody>
          </table>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
