---
name: frontend-visayasmed
description: Frontend guidelines and UI rules for the VisayasMed Hospital Online Quotation project. Use whenever building or modifying frontend components, pages, or styling.
---
# Goal
Ensure brand consistency, modern design, and a unified UI for the VisayasMed Hospital frontend.

# Design & Branding Rules
* **Brand Name:** Always use the exact naming "VisayasMed Hospital" in headers, footers, and copy.
* **Logo:** Ensure the VisayasMed logo is prominently and correctly placed, specifically on the Login page and main navigation.
* **Color Palette:** Apply a Minimalist Neutral color scheme with a cool accent to ensure an eye-friendly, user-friendly, and professional medical interface.
* **Login Page:** The background of the login page must be clean, branded, and non-distracting.

# UI/UX Components
* **Buttons:** Enforce strict uniformity across all buttons (border-radius, padding, hover states, and primary/secondary hierarchy).
* **Icons:** Use only minimal, modern icon sets.
* **Architecture:** The frontend MUST NOT make direct database queries. All data interactions must occur exclusively through the backend API.

# Hybrid RBAC UI Handling
* **Conditional Rendering:** Always conditionally render action buttons (Add, Edit, Delete) and navigation links based strictly on the resolved permissions array provided by the backend API.
* **No Client-Side Math:** Do not attempt to calculate user overrides on the frontend. Rely entirely on the boolean values (e.g., `canEdit: true`) sent by the backend.
* **Graceful Fallbacks:** If a user navigates to a page they do not have `CanView` access for, the UI must intercept the route and display a clean, branded VisayasMed "Access Denied" or "403 Unauthorized" component.