// routes/oauthCallback.js
// Server-side OAuth callback for LINE Login
// LINE redirects here → we redirect to app via aiklao:// scheme

const express = require("express");
const router = express.Router();

router.get("/callback", (req, res) => {
  const { code, state, error, error_description } = req.query;

  // Build aiklao:// URL with all params
  const params = new URLSearchParams();
  if (code) params.set("code", code);
  if (state) params.set("state", state);
  if (error) params.set("error", error);
  if (error_description) params.set("error_description", error_description);

  const appUrl = `aiklao://auth/callback?${params.toString()}`;

  // HTML page that auto-redirects to app
  // (302 redirect doesn't work for custom schemes — need meta refresh + JS)
  res.set("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0;url=${appUrl}">
  <title>กำลังกลับสู่แอป AiKlao...</title>
  <style>
    body { font-family: sans-serif; text-align: center; padding: 40px 20px; background: #F4F6F8; }
    h1 { color: #0E7C66; }
    a { color: #0E7C66; }
  </style>
</head>
<body>
  <h1>กำลังเปิดแอป AiKlao...</h1>
  <p>ถ้าไม่กลับอัตโนมัติ <a href="${appUrl}">กดที่นี่</a></p>
  <script>window.location.href = ${JSON.stringify(appUrl)};</script>
</body>
</html>`);
});

module.exports = router;