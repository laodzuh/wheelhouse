# wheelhouse-sync-server

Tiny HTTP service that holds a single JSON blob + a monotonic version number.
Intended to run on a tailnet node, exposed only via `tailscale serve`, and
talked to by the Wheelhouse client for multi-device sync.

## API

All `/sync*` routes require `Authorization: Bearer $SYNC_SECRET`.

| Method | Path             | Purpose                                |
| ------ | ---------------- | -------------------------------------- |
| GET    | `/healthz`       | Liveness probe (no auth).              |
| GET    | `/sync/version`  | Returns `{ version, updatedAt }`.      |
| GET    | `/sync`          | Returns the stored envelope.           |
| PUT    | `/sync`          | Replaces the blob. Optimistic locking. |

`PUT /sync` requires `X-Expected-Version: <int>`. If the server's current
version doesn't match, it returns `409` with the current version in the body
and the `X-Sync-Version` header.

## Local setup

```sh
cd sync-server
npm install
cp .env.example .env
# Generate a secret and paste it into .env as SYNC_SECRET=
openssl rand -base64 32
npm start
```

Smoke test from another shell:

```sh
SECRET=$(grep ^SYNC_SECRET .env | cut -d= -f2)
curl -s http://localhost:8787/healthz
curl -s -H "Authorization: Bearer $SECRET" http://localhost:8787/sync/version
```

## Run as a systemd service

```sh
sudo cp wheelhouse-sync.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now wheelhouse-sync
sudo systemctl status wheelhouse-sync
journalctl -u wheelhouse-sync -f
```

If you use nvm or a non-system Node, edit the `ExecStart=` line in
`wheelhouse-sync.service` before copying.

## Expose via Tailscale

The server binds only to `127.0.0.1`. `tailscale serve` is the only path in
from the tailnet, and it handles HTTPS with a real Let's Encrypt cert.

Requirements (check once in your tailnet admin):
- MagicDNS: on
- HTTPS certificates: on

Start serving (syntax varies slightly by Tailscale version; check
`tailscale serve --help` if these flags differ):

```sh
# Modern (v1.56+):
sudo tailscale serve --bg 8787

# Explicit form:
sudo tailscale serve --bg --https=443 http://localhost:8787
```

Verify from another tailnet device:

```sh
curl https://omarchy.<your-tailnet>.ts.net/healthz
```

To stop or inspect:

```sh
tailscale serve status
sudo tailscale serve reset   # remove all serve configs
```

## Files on disk

- `data/sync.json` — `{ version, updatedAt, body }`. Atomically replaced on PUT.
- `data/sync.json.tmp` — transient; exists only during a write.

Back up `data/` if you care about your wheel trades.
