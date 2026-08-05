# Blawgy Live Fixtures

This folder is for sanitized authenticated Blawgy API captures used to prove the
local backend contract against the real production backend.

Do not store raw browser session material, tokens, keys, payment IDs, private
emails, addresses, or customer data here. JSON fixture files in this folder are
gitignored by default.

Fixture shape:

```json
[
  {
    "method": "GET",
    "path": "/api/plan/example.com",
    "status": 200,
    "response": {
      "site": "example.com",
      "entries": []
    }
  }
]
```

Optional fields:

- `requestBody`: body to send to the local backend for non-GET requests.
- `note`: short human note about the captured screen/action.

Run `npm run check` after adding fixture JSON. The fixture verifier compares
HTTP status and JSON structure against the local backend. Values may differ;
shape should not.

Run `npm run check:blawgy-strict` for the exact-parity gate. It verifies the
current public Blawgy asset hashes and fails until sanitized authenticated
production fixtures cover the critical backend surfaces:

- `GET /me`
- `GET /get-user-details`
- `GET /get-site-settings`
- `GET /all-blog-posts`
- `GET /api/plan/<site>`
- `GET /api/products/<site>`
- `GET /api/pages/business-profiles`
- `GET /api/article-builder/drafts`
- `GET /api/seo/status/<site>`
- `GET /api/ai-mentions/<site>`
- `GET /subscription-details`
- `GET /gsc/data`

To sanitize a browser HAR export:

```bash
node scripts/sanitize-blawgy-har.js /path/to/blawgy.har
```

By default this exports only GET JSON responses from `app.blawgy.com`. Use
`--include-writes` only for deliberately captured write flows.
