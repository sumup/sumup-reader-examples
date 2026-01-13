# React Reader Example

React + Vite frontend that links readers via `POST /readers`, lists them via `GET /readers`, and starts a reader checkout via `POST /readers/{id}/checkout`.

## Run

1. Start any backend example (defaults to `http://localhost:8080`).
2. Install dependencies and start the dev server:

```sh
cd frontend/react
npm install
npm run dev
```

3. Open the URL printed by Vite and link a reader.

If your backend is on another origin, enter its base URL (for example `http://localhost:8080`). The backend must allow CORS for cross-origin requests.
