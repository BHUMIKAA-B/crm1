---
name: changes_requested property status
description: Distinct status for admin "Request Changes" action in the approval workflow.
---

# `changes_requested` property status

## Rule
PropertyStatus in `backend/models.py` includes `"changes_requested"` as a distinct status between `pending_verification` and `published`.

**Why:** Previously, "Request Changes" set status back to `pending_verification`, making it indistinguishable from a fresh submission and preventing sellers from seeing admin feedback.

## Flow
1. Admin clicks "Request Changes" in AdminApprovals → `PUT /admin/properties/{id}/request-changes`
2. Status → `changes_requested`, message stored in `rejection_reason`
3. Seller sees orange "Needs changes" badge + feedback text + "Edit & Resubmit" button
4. Seller edits via `PUT /seller/properties/{id}` → status auto-resets to `pending_verification`
5. Property reappears in admin pending queue

## How to apply
- SellerDashboard STATUS_META has orange styling for `changes_requested`
- Admin dashboard stats count it separately under `changes_requested_listings`
- Admin pending queue (`GET /admin/properties/pending`) only shows `pending_verification` — correct by design
