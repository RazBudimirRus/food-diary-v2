# TLS certificates for Caddy (Phase 6)

Place your wildcard `*.razbudimir.com` certificate files here **before** `docker compose up`:

| File | Description |
|------|-------------|
| `fullchain.pem` | Full certificate chain |
| `privkey.pem` | Private key |

## Example (on VPS)

```bash
sudo mkdir -p /srv/foodbot/certs
sudo cp /path/to/fullchain.pem /srv/foodbot/certs/
sudo cp /path/to/privkey.pem /srv/foodbot/certs/
sudo chmod 600 /srv/foodbot/certs/privkey.pem
sudo chown -R $USER:$USER /srv/foodbot/certs
```

## Verify

```bash
openssl x509 -in fullchain.pem -noout -subject -dates
```

## DNS

Create an **A record** before going live:

```
fooddiary.razbudimir.com  →  <VPS IP>
```

## Never commit

`*.pem` files are gitignored. Do not add private keys to the repository.
