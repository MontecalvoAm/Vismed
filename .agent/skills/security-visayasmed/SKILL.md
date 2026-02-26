---
name: security-checker-visayasmed
description: Audits and enforces the minimum production security standards for the VisayasMed project. Use when reviewing pull requests, finalizing API endpoints, or configuring servers.
---
# Goal
Enforce the ⭐ Minimum Production Standard across the entire application stack.

# Security Checklist & Instructions
Whenever reviewing code or generating infrastructure, actively check against and implement the following:
* **Transport:** ✔ Enforce strict HTTPS for all traffic.
* **Auth Layer:** ✔ Validate the implementation of JWT + Refresh tokens.
* **State:** ✔ Ensure all sensitive state uses Secure, HttpOnly cookies.
* **Cryptography:** ✔ All passwords must be hashed using Argon2 (preferred) or bcrypt. Never store plain text.
* **Sanitization:** ✔ Enforce rigorous Input validation on all incoming API requests to prevent XSS and SQL injection.
* **Access Control:** ✔ Verify explicit Authorization checks (RBAC/ABAC) on every protected endpoint.
* **Traffic Control:** ✔ Implement Rate limiting on public and authentication endpoints.
* **Traceability:** ✔ Ensure comprehensive Audit logs are recorded for all sensitive transactions and access events.
# Authorization Enforcement (Hybrid RBAC)
* ✔ **Granular Endpoint Checks:** Verify that every single API route checks the user's explicit permission (e.g., `CanEdit` for a PUT/PATCH request, `CanDelete` for a DELETE request), not just their base role.
* ✔ **Override Verification:** Ensure the authorization middleware correctly respects `MT_UserOverride` settings over the default role settings.
* ✔ **Fail Secure:** If a permission is undefined or missing for a user/role, the system must default to denying access (403 Forbidden).