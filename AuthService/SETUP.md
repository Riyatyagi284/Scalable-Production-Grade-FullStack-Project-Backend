# AuthService — Local Setup

## Why this guide exists

A few things were not obvious from the existing `.env.example`/Readme and caused first-run failures:

1. **The app reads `.env.dev`, not `.env`.** `src/config/index.ts` loads `.env.${NODE_ENV}` and the `dev` npm script sets `NODE_ENV=dev`. Credentials in a file called `.env` are silently ignored.
2. **PostgreSQL has no user named `root`.** The default superuser is `postgres` (the `root` username is a MySQL convention). Using `DB_USERNAME=root` produces `password authentication failed for user "root"` from both the app and any DB GUI client.
3. **`.env.example` previously omitted `PRIVATE_KEY`, `CLIENT_UI_DOMAIN`, `ADMIN_UI_DOMAIN`, and `MAIN_DOMAIN`,** all of which the app needs.
4. **The repo did not provision Postgres** — there was no compose file, so new contributors had to figure DB setup out themselves.

This change adds a one-command Postgres setup, a complete `.env.example`, and this guide.

## Quick start (5 commands)

```bash
# 1. Start Postgres (port 5432; override with DB_PORT=5434 if in use)
docker compose up -d

# 2. Generate the RSA keypair for RS256 JWTs
node scripts/generateKeys.mjs

# 3. Create your env file and fill in PRIVATE_KEY + REFRESH_TOKEN_SECRET
cp .env.example .env.dev
#    - paste contents of certs/private.pem into PRIVATE_KEY (escape newlines as \n)
#    - generate a refresh secret:
#        node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 4. Install deps and run migrations
npm install
npx typeorm-ts-node-commonjs migration:run -d src/config/data-source.ts

# 5. Run the service
npm run dev
```

You should see:

```
{"level":"info","message":"Database connected successfully.","serviceName":"auth-service",...}
{"level":"info","message":"Listening on port 5501","serviceName":"auth-service",...}
```

Smoke-test it:

```bash
curl http://localhost:5501/
# → Welcome to Auth service from K8s
```

## Troubleshooting

**`password authentication failed for user "root"`**
Your `.env.dev` (or DB client) has `DB_USERNAME=root`. Change it to `postgres`. Postgres has no default `root` user.

**`ECONNREFUSED 127.0.0.1:5432`**
Postgres isn't running, or it's on a different port. Check `docker compose ps`. If host port 5432 is taken, start with `DB_PORT=5434 docker compose up -d` and put the same `DB_PORT=5434` in `.env.dev`.

**App starts but `Listening on port undefined`**
You created `.env`, not `.env.dev`. Rename it.

**`Error while reading private key`**
`PRIVATE_KEY` is empty in `.env.dev`. Run `node scripts/generateKeys.mjs` and paste `certs/private.pem` into the env var (with `\n` for newlines, wrapped in double quotes).

## Reset everything

```bash
docker compose down -v   # wipes the Postgres volume
rm -rf node_modules certs .env.dev
```
