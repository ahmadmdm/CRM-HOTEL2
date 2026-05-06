# Production Deployment

This project runs in production behind a host-managed Caddy reverse proxy. Caddy is intentionally outside Docker and is responsible for TLS termination and routing public traffic to the loopback ports exposed by the production Compose override.

Reference file in the repository: `Caddyfile.example`

## Production Topology

- Public domain: `https://crm.clo0.net`
- Frontend container: `127.0.0.1:3810 -> 3000`
- Backend container: `127.0.0.1:3811 -> 8000`
- PostgreSQL: internal only
- Redis: internal only

The production stack is started by merging the base file with the production override:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

## Why Caddy Matters Here

The frontend does not call the backend directly from the browser. Browser requests go to `/api/backend/*` on the same domain, then Next.js rewrites them to backend `/api/v1/*`.

That means the Caddy route order is not optional. If `/api/backend/*` is sent directly to the backend, login and other browser-side API calls will fail.

## Required Route Model For `crm.clo0.net`

Current working host configuration:

```caddy
crm.clo0.net {
  import cloudflare_tls

  handle /api/backend/* {
    reverse_proxy 127.0.0.1:3810
  }

  handle /api/* {
    reverse_proxy 127.0.0.1:3811
  }

  handle /uploads/* {
    reverse_proxy 127.0.0.1:3811
  }

  handle /health {
    reverse_proxy 127.0.0.1:3811
  }

  handle /api/docs* {
    reverse_proxy 127.0.0.1:3811
  }

  handle /api/redoc* {
    reverse_proxy 127.0.0.1:3811
  }

  handle /api/openapi.json {
    reverse_proxy 127.0.0.1:3811
  }

  handle {
    reverse_proxy 127.0.0.1:3810
  }
}
```

The repository copy at `Caddyfile.example` is the reference block to keep aligned with the host-managed `/etc/caddy/Caddyfile`.

## Important Routing Rule

`/api/backend/*` must be handled before `/api/*`.

Reason:

- Browser calls `https://crm.clo0.net/api/backend/auth/login`
- Caddy must send that request to the frontend on `3810`
- Next.js rewrite in `frontend/next.config.js` converts it to backend `/api/v1/auth/login`
- If Caddy sends `/api/backend/*` straight to the backend, the backend receives an unknown route and returns `404`

## Validation Checklist After Any Caddy Edit

1. Validate the Caddy configuration.

```bash
caddy validate --config /etc/caddy/Caddyfile
```

2. Reload Caddy.

```bash
systemctl reload caddy
```

3. Verify the containers are up.

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
```

4. Verify backend health.

```bash
curl https://crm.clo0.net/health
```

5. Verify login API routing.

```bash
curl -X POST https://crm.clo0.net/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@crm.clo0.net","password":"<password>"}'
```

6. Verify browser login from the login page.

Expected result: successful redirect from `/login` to `/`.

## Compose Notes

`docker-compose.prod.yml` uses Docker Compose `!override` tags to remove development bind mounts and public database/cache ports.

Recommended requirement:

- Docker Engine 20.10+
- Docker Compose v2.x

Production command:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml config
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

## Operational Notes

- Caddy is host-managed and not part of the Docker stack.
- If `crm.clo0.net` breaks after a proxy edit, inspect Caddy route order before debugging the application.
- The backend uses rate limiting keyed by real client IP headers (`CF-Connecting-IP` or `X-Forwarded-For`) when running in staging or production.
- The login page in production should not display any built-in credentials.