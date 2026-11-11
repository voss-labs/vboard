# vboard — Future / Deferred

Things intentionally out of v1. Don't add until the trigger condition is met.

## Schema

- `comment` / `reaction` tables — when a post-engagement feature is requested.
- `category` / `tag` on posts — when the discover feed needs filter UI.
- `community_follow` + notifications — v2.
- `semester` on profile, and targeting events by year, semester or division ("BE Sem 8 only"). Year and division are already collected.
- A way for faculty and staff, who have no roll number, to register for events.

## Features

- More for registration questions — further question types (multiple choice, short text, dates), file uploads, and editing answers after submitting. Add when an event needs one.
- Roll number CSV validation — admin uploads the official VIT student list, signups must match a row. Add when fake-account spam becomes a real problem.
- Push / email notifications on event reminders, approval decisions.
- Inter-college / alumni `guest` role — opens vboard to non-`@vit.edu.in` users for open events.
- Payments / paid event tickets — not currently a use case.

## Deployment / ops

- Custom subdomain on R2 bucket for cleaner image URLs.
- Cloudflare Cache rules for high-traffic event pages.

## RBAC

Deferred permission extensions require a new product decision. The current four-role model is documented in `research/rbac.md`.
