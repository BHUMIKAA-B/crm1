---
name: Proxy fix
description: Why setupProxy.js was added and craco proxy removed
---

## Problem
`@emergentbase/visual-edits` middleware in the craco dev server intercepted POST requests before the `/api` proxy ran, causing all POSTs (login, enquiry, chat) to hang for 15 seconds then timeout. GET requests worked fine.

## Fix
Created `frontend/src/setupProxy.js` — CRA's native proxy file, loaded before any craco plugin. Uses `http-proxy-middleware` to forward `/api/*` to `http://localhost:8001`. The `devServerConfig.proxy` block was removed from `craco.config.js`.

**Why this works:** CRA loads `setupProxy.js` at the express middleware layer, before craco plugins run, bypassing the visual-edits interceptor.
