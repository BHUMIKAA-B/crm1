"""Email service — Resend (if RESEND_API_KEY set), else log-only."""
from __future__ import annotations

import logging
import os
from typing import Optional

import httpx

log = logging.getLogger("visitsarva.email")


async def send_email(
    to: str,
    subject: str,
    html: str,
    text: Optional[str] = None,
) -> bool:
    """Send an email via Resend. Returns True if dispatched.

    RESEND_NOTIFY_EMAIL: if set, all enquiry emails also go there.
    This works around Resend test-mode which only allows sending
    to the account owner until a domain is verified at resend.com/domains.
    """
    api_key = os.environ.get("RESEND_API_KEY")
    sender = os.environ.get("EMAIL_FROM", "VisitSarva <onboarding@resend.dev>")
    notify_override = os.environ.get("RESEND_NOTIFY_EMAIL", "").strip()

    if not api_key:
        log.info("[email:log-only] to=%s subject=%s", to, subject)
        return False

    # Build recipient list — always include the override so test-mode works
    recipients: list[str] = []
    if notify_override:
        recipients.append(notify_override)
        if to.lower() != notify_override.lower() and to not in recipients:
            # Attempt delivery to actual seller too; Resend will reject in
            # test-mode but will succeed once the domain is verified.
            recipients.append(to)
    else:
        recipients.append(to)

    try:
        async with httpx.AsyncClient(timeout=10.0) as cl:
            r = await cl.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": sender,
                    "to": recipients,
                    "subject": subject,
                    "html": html,
                    "text": text or "",
                },
            )
            if r.status_code >= 400:
                log.warning("Resend error %s: %s", r.status_code, r.text)
                # Retry with only the override if we tried multiple recipients
                # (Resend test-mode rejects multi-recipient lists)
                if notify_override and len(recipients) > 1 and r.status_code == 403:
                    r2 = await cl.post(
                        "https://api.resend.com/emails",
                        headers={
                            "Authorization": f"Bearer {api_key}",
                            "Content-Type": "application/json",
                        },
                        json={
                            "from": sender,
                            "to": [notify_override],
                            "subject": subject,
                            "html": html,
                            "text": text or "",
                        },
                    )
                    if r2.status_code < 400:
                        log.info("Email delivered to notify override %s", notify_override)
                        return True
                return False
            log.info("Email sent to %s", recipients)
            return True
    except Exception as e:
        log.warning("Email send failed: %s", e)
        return False


# --- Templates ---
def tpl_welcome(name: str, role: str) -> tuple[str, str]:
    subject = "Welcome to VisitSarva"
    html = f"""
    <div style='font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#1a1f2e'>
      <h2 style='color:#0F2340;font-weight:600'>Welcome to VisitSarva, {name}!</h2>
      <p>You're now signed up as a <strong>{role}</strong>. Zero brokerage. Always.</p>
      <p style='margin-top:24px'><a href='{os.environ.get("CLIENT_URL","")}'
         style='background:#0D7A6B;color:#fff;padding:10px 22px;text-decoration:none;border-radius:6px'>Start exploring</a></p>
      <p style='font-size:12px;color:#5b6371;margin-top:32px'>VisitSarva — Buy property, pay no brokerage.</p>
    </div>
    """
    return subject, html


def tpl_listing_status(title: str, status: str, reason: str = "") -> tuple[str, str]:
    if status == "published":
        head = "Your listing is live!"
        body = f"Great news — <strong>{title}</strong> has been verified by our team and is now live on VisitSarva."
        cta = f'<a href=\'{os.environ.get("CLIENT_URL", "")}/properties\' style=\'background:#0D7A6B;color:#fff;padding:10px 22px;text-decoration:none;border-radius:6px\'>View listing</a>'
    elif status == "changes_requested":
        head = "Changes requested for your listing"
        body = f'Our team reviewed <strong>{title}</strong> and needs the following changes before it can go live:<br/><br/><blockquote style=\'border-left:3px solid #f97316;padding:8px 16px;margin:12px 0;color:#7c3d00\'>{reason}</blockquote>Please update your listing and resubmit.'
        cta = f'<a href=\'{os.environ.get("CLIENT_URL", "")}/seller/dashboard\' style=\'background:#f97316;color:#fff;padding:10px 22px;text-decoration:none;border-radius:6px\'>Update listing</a>'
    elif status == "rejected":
        head = "Listing not approved"
        body = f'We were unable to approve <strong>{title}</strong>. Reason: <em>{reason}</em>'
        cta = f'<a href=\'{os.environ.get("CLIENT_URL", "")}/seller/dashboard\' style=\'background:#dc2626;color:#fff;padding:10px 22px;text-decoration:none;border-radius:6px\'>View dashboard</a>'
    else:
        head = "Update on your listing"
        body = f'Your listing <strong>{title}</strong> has been updated to status: <em>{status}</em>.'
        cta = ""

    html = f"""
    <div style='font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#1a1f2e'>
      <h2 style='color:#0F2340'>{head}</h2>
      <p>{body}</p>
      {"<p style='margin-top:24px'>" + cta + "</p>" if cta else ""}
      <p style='font-size:12px;color:#5b6371;margin-top:32px'>VisitSarva — Buy property, pay no brokerage.</p>
    </div>
    """
    return head, html


def tpl_new_enquiry(property_title: str, name: str, phone: str, email: str, message: str) -> tuple[str, str]:
    subject = f"New enquiry: {property_title}"
    html = f"""
    <div style='font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#1a1f2e'>
      <h2 style='color:#0F2340'>New enquiry on {property_title}</h2>
      <p><strong>{name}</strong><br/>{email}<br/>{phone}</p>
      <p style='background:#fafaf7;padding:14px;border-radius:6px'>{message or "(no message)"}</p>
    </div>
    """
    return subject, html
