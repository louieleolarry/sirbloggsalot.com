# Pre-login Production State - 2026-08-04

Purpose: baseline the live `sirbloggsalot.com` site before applying login support. Do not deploy login/auth changes until the current production files are inspected again and the overwrite list is reported first.

## Target

- Domain: `sirbloggsalot.com`, `www.sirbloggsalot.com`
- EC2 target: `quicksites-prod`
- SSH user/host: `ec2-user@52.89.51.130`
- Verified host identity: `ip-172-31-44-236.us-west-2.compute.internal`
- Web root: `/var/www/sirbloggsalot.com/html`
- Active nginx vhost: `/etc/nginx/sites-available/sirbloggsalot.com`

## Production Files

Remote root inventory at the baseline:

```text
/var/www/sirbloggsalot.com/html/
  app.js
  index.html
  robots.txt
  sitemap.xml
  styles.css
  app-screenshots/dashboard.png
  app-screenshots/gsc-traffic.png
  app-screenshots/keyword-finder.png
  assets/sirbloggsalot-og.png
```

Remote root SHA-256 hashes:

```text
869d3ebeadda1c5574dd720186455a0664908164026acbf5aea9eb8aaf72cbe9  app.js
24d4731c7285f04d96efae73ca825cbb5687ff9388f56686b999fefae6d42145  index.html
40ef4ca1ad33276ae4014152ee3c5f322597af30681152d3f2dd978ddb2243b6  robots.txt
826d7aad28b55bdad4805a719a8107b0ee00ff456e851333f87ff8bafb3b0666  sitemap.xml
22b38dd7c5b56d98d675325a3a2678cbf16c118d9fa3b8f116c35c59f2b88cad  styles.css
7ba8839106edda37d2e545a11c4201c9bff9de569a5a64b6a429fe572859b74d  app-screenshots/dashboard.png
8e3b8c48aad308dbce74333145f04327c79a0552634989de08b758b934a0f71f  app-screenshots/gsc-traffic.png
32d0913aee093b444f1942b0678aba01a6c912adff557ec9fcea72ab1306f6f9  app-screenshots/keyword-finder.png
751711577e9fba7387f2e2c1fffa0434af68672f7e1562c6987d66443045b7a8  assets/sirbloggsalot-og.png
```

Important: `assets/sirbloggsalot-og.png` exists on production and is not present in the local file list. Preserve it unless the user explicitly authorizes changing it.

## Nginx State

The live nginx config is static-only:

- `root /var/www/sirbloggsalot.com/html;`
- `location / { try_files $uri /index.html; }`
- static asset cache block for css/js/images/fonts
- no `/api/` proxy block
- no `/account` proxy block

`nginx -t` passed at baseline.

## Service State

No Sir Bloggsalot Node service is installed at baseline:

```text
systemctl is-active sirbloggsalot.service -> inactive
systemctl is-enabled sirbloggsalot.service -> No such file or directory
/etc/systemd/system/sirbloggsalot.service -> absent
/etc/sirbloggsalot.env -> absent
```

## Route Behavior

Host-local HTTPS checks using SNI/resolve against nginx:

```text
GET https://sirbloggsalot.com/ -> 200 text/html, Content-Length 24838
HEAD https://sirbloggsalot.com/login -> 200 text/html, Content-Length 24838
HEAD https://sirbloggsalot.com/api/auth/config -> 200 text/html, Content-Length 24838
```

Because nginx is static-only, `/api/auth/config` currently falls back to `index.html`; it is not a JSON API.

## Local State

Local check passed:

```sh
npm run check
```

Output summary:

```text
Route and homepage markers present.
Auth helper checks passed.
```

## Deployment Guardrail

Before any login-support deployment:

1. Re-run this production inventory and hash check.
2. Compare remote files against the exact local files proposed for deployment.
3. Report the overwrite/add/remove list to the user before copying anything.
4. Back up the remote web root and nginx config.
5. Deploy only explicit authorized files; do not use broad sync/delete.
6. Preserve remote-only files such as `assets/sirbloggsalot-og.png` unless explicitly authorized.
