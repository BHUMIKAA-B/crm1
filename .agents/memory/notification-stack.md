---
name: Notification stack
description: How enquiry notifications are delivered to sellers (WhatsApp + email)
---

## Services
- **WhatsApp**: Twilio REST API via `backend/services/whatsapp.py`. Secrets: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM.
- **Email**: Resend API via `backend/services/email.py`. Secret: RESEND_API_KEY.

## Resend test-mode limitation
Resend free/test accounts can only send TO the account owner's email until a domain is verified at resend.com/domains.

**Workaround in place**: `RESEND_NOTIFY_EMAIL` env var (shared). If set, all enquiry emails are first attempted to actual seller + override. On 403, retried with override-only. Once domain is verified at Resend, remove this workaround.

**Why:** Resend rejects multi-recipient lists in test mode with HTTP 403 + "validation_error".

## WhatsApp phone normalisation
Input formats accepted: `+91XXXXXXXXXX`, `91XXXXXXXXXX` (12 digits), `XXXXXXXXXX` (10-digit India). Strip `whatsapp:` prefix from both From and To before re-adding it — prevents `whatsapp:whatsapp:+91...` double-prefix.

## Trigger
`backend/routers/enquiries_router.py` — calls `send_email` then `send_whatsapp` after inserting enquiry and pushing in-app notification to seller.
