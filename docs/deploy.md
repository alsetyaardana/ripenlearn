# Deployment Runbook — Ripen (Docker Compose + Cloudflare)

Dokumen ini melengkapi plan Task 6.2–6.3: tata letak jaringan produksi, TLS ownership,
dan prosedur backup/restore database. **Jangan commit `.env` atau dump database ke git.**

## Topologi yang dipakai (default)

```
Internet
   │
   ▼
Cloudflare (DNS + TLS eksternal, proxy mode "Full (strict)")
   │
   ▼  cloudflared tunnel (host)  ──attached ke──► proxy-net (external docker network)
   │                                                    │
   ▼                                                    ▼
  https://<domain>                              http://app:3000 (Docker DNS)
                                                          │
                                              ┌───────────┼───────────┐
                                              ▼           ▼           ▼
                                          db (5432)   redis (6379)   caddy (optional)
                                            │            │
                          keduanya hanya di network `internal`,
                          tidak ter-expose ke jaringan publik
```

- **TLS external dipegang Cloudflare tunnel.** Caddy tidak membuka port 80/443 publik
  di topologi ini — service `caddy` ada di `profiles: ["tls-caddy"]` dan tidak jalan
  secara default.
- **DB dan Redis hanya di network `internal`.** Host port dibind ke `127.0.0.1`
  (`DB_PORT_EXPOSE`/`REDIS_PORT_EXPOSE`), cukup untuk `prisma migrate dev`/`psql`
  dari host, tidak bisa diakses dari luar.
- `app` tidak punya host port publik — Cloudflare tunnel menjangkaunya lewat Docker
  DNS `http://app:3000` di network `proxy-net`.

## Prasyarat host

- Docker Engine + Docker Compose plugin.
- `cloudflared` binary di host, tunnel yang sudah dibuat untuk domain yang dipakai.
- Network docker `proxy-net` (external) yang juga di-attach ke container tunnel:
  ```bash
  docker network create proxy-net
  ```

## Deploy pertama

```bash
cp .env.example .env
# isi minimal: POSTGRES_PASSWORD (jangan pakai default), DATABASE_URL (host `db`),
# REDIS_URL (host `redis`), NEXTAUTH_SECRET, GOOGLE_CLIENT_ID/SECRET, DEEPSEEK_API_KEY,
# NEXTAUTH_URL = https://<domain> (origin publik, bukan localhost)

docker compose up -d --build
docker compose exec db pg_isready -U "${POSTGRES_USER:-ripen}"
npx prisma migrate deploy        # dari host, via 127.0.0.1 binding
```

Catatan `NEXTAUTH_URL`: harus sama dengan origin publik yang dipakai browser
(`https://<domain>`), karena Google OAuth `redirect_uri` dibangun darinya.

## Cloudflare Tunnel

Jalankan tunnel di host (bukan di compose) dengan origin `http://app:3000`:

```bash
cloudflared tunnel run --url http://app:3000 --no-autoupdate  # quick test / Named tunnel
```

Untuk named tunnel (disarankan):

```bash
cloudflared tunnel login
cloudflared tunnel create ripen
cloudflared tunnel route dns ripen <domain>
# config.yml: tunnel: <id> / ingress: [{ hostname: <domain>, service: http://app:3000 }]
cloudflared tunnel run ripen
```

Verifikasi dari host tempat container `app` dan tunnel sama-sama attached ke
`proxy-net`:

```bash
docker run --rm --network proxy-net curlimages/curl -s http://app:3000 | head -5
```

## Caddy sebagai alternatif TLS (tanpa Cloudflare)

Kalau deployment memilih Caddy sebagai public TLS endpoint, aktifkan profile dan
isi domain di `Caddyfile`:

```bash
docker compose --profile tls-caddy up -d --build
```

Jangan menjalankan Cloudflare tunnel dan Caddy public TLS bersamaan — satu owner
TLS per deployment (lihat plan Task 6.3.1).

## Backup / Restore database

Backup (host, lewat binding 127.0.0.1):

```bash
docker compose exec -T db pg_dump -U "${POSTGRES_USER:-ripen}" -d "${POSTGRES_DB:-ripen}" \
  | gzip > "backup-$(date +%F-%H%M).sql.gz"
```

Restore:

```bash
gunzip -c backup-2026-08-03-0500.sql.gz \
  | docker compose exec -T db psql -U "${POSTGRES_USER:-ripen}" -d "${POSTGRES_DB:-ripen}"
```

Simpan dump di luar container volume (folder backup terpisah, tidak di repo).
Sebelum migration produksi: backup dulu, lalu `npx prisma migrate deploy`.

## Checklist produksi (Task 6.3)

- [ ] `POSTGRES_PASSWORD` di `.env` ≠ default (`changeme`).
- [ ] `NEXTAUTH_URL` = origin publik (`https://<domain>`), konsisten dengan
      Google OAuth `redirect_uri`.
- [ ] Tidak ada host port publik untuk DB (5432) / Redis (6379) — hanya
      `127.0.0.1` atau tanpa binding.
- [ ] `app` hanya `expose` 3000; publik lewat tunnel/Caddy, bukan host port.
- [ ] `.env`, dump SQL, dan `prisma/*.db` gitignored.
- [ ] Backup DB berhasil diuji sebelum `migrate deploy`.
- [ ] `docker compose config --quiet` pass.
- [ ] Healthcheck `app` merespons lewat `proxy-net` dari container tunnel.

## Verifikasi cepat

```bash
docker compose config --quiet
docker compose ps                     # semua healthy
docker compose exec db pg_isready -U "${POSTGRES_USER:-ripen}"
```
