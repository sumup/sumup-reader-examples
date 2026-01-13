# Static Reader Example

This example is plain HTML, CSS, and JavaScript. It links readers via `POST /readers`, lists them via `GET /readers`, and starts a reader checkout via `POST /readers/{id}/checkout`.

## Run

1. Start any backend example (defaults to `http://localhost:8080`).
2. Serve this folder with any static server (pick one):

```sh
cd frontend/static

# Python
python -m http.server 3000

# Node (npx one-liners)
npx serve . -l 3000
npx http-server . -p 3000

# Go (no install step needed)
go run github.com/caddyserver/caddy/v2/cmd/caddy@latest file-server --root . --listen :3000

# Ruby
ruby -run -e httpd . -p 3000

# PHP
php -S localhost:3000 -t .
```

3. Open http://localhost:3000 and link a reader.

If your backend is not on the same origin, enter its base URL (for example `http://localhost:8080`). The backend must allow CORS for cross-origin requests.
