---
name: add-dependency
description: Decide whether an npm package may be added to this repo. Use before npm install, when picking a library, or when a task seems to need a database, service, or tool.
---

npm packages are fine and encouraged. Only two questions.

## 1. Does it need infrastructure?

Does it require a service, daemon, container, cloud account, or native build?

- A server or daemon to be running (Postgres, MySQL, Redis, Elasticsearch,
  RabbitMQ, a message broker).
- Docker, docker-compose, podman, minikube.
- `brew install`, `apt-get install`, `systemctl`.
- A native addon / node-gyp compile — `better-sqlite3`, `bcrypt`, `canvas`,
  `sharp`, `node-sass`.
- An API key or cloud account to boot.

Any yes -> **stop and ask the user**. `nvm use && npm install && npm run dev`
must still work from a fresh clone.

Usual replacements: `node:sqlite` for any database, `node:crypto` (scrypt) for
bcrypt, a WASM build for a native addon.

## 2. Does it duplicate something we have?

Check `use-the-library` first. If Mantine, `@mantine/form`, React Query, Zod, or
Drizzle already covers it, use that.

Also stop and ask if it is: a date library (use `@mantine/dates` /
`Intl.DateTimeFormat`), a validation library (Zod), an HTTP client (ts-rest), a
state manager (React Query), or a utility grab-bag.

## Otherwise

Install at the **repo root** with the right workspace:

```sh
npm install -w apps/web some-package
```

Never `npm install` inside a workspace directory. Commit the lockfile change.
Then `npm run check`.
