/**
 * CRA native proxy setup — loaded by the dev server before any craco/babel
 * plugins run, so it is not affected by @emergentbase/visual-edits middleware.
 *
 * All /api/* requests (GET, POST, PUT, DELETE, OPTIONS) are forwarded to the
 * FastAPI backend on port 8001.
 */
const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
  app.use(
    "/api",
    createProxyMiddleware({
      target: process.env.BACKEND_URL || "http://127.0.0.1:8000",
      changeOrigin: true,
      // Do NOT rewrite the path — backend already has /api prefix
      on: {
        error: (err, req, res) => {
          console.error("[proxy] error:", err.message);
          res.status(502).json({ detail: "Backend unavailable" });
        },
      },
    })
  );
};
