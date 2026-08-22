# Sir Bloggsalot Routing Notes

First pass status: local homepage emulation and basic route shell only.

Future launch plan requirements:

- Prepare a formal routing plan before production changes. Include `/`, `/blog`, individual blog article routes, `/features`, `/pricing`, `/faq`, `/login`, `/signup`, and case-study URLs.
- Preserve homepage anchor navigation with explicit section IDs, matching the AI Usage style: `#features`, `#pricing`, `#faq`, and `#case-studies`.
- Treat production as a separate launch decision. Resolve the intended sister EC2, domain root, nginx routes, health checks, and backup plan before deployment.
- Google auth is implemented with signed sessions and role-aware users. Production runs `sirbloggsalot.service` on QuickSites with a persistent `/etc/sirbloggsalot.env`, proxies `/api/*` and `/account` through nginx, and exposes `/api/health` for verification.
- Do not include the AI assistant/chat widget in this product surface unless it is explicitly re-scoped later.
- Blog is in scope for launch. Add feed files, canonical URLs, metadata, sitemap entries, and article templates in the next pass.
