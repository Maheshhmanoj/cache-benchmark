# Decision log

## Iteration 0 - Repo setup
- **Name `cache-benchmark`:** short, says what the project does.
- **Public repo:** this is a portfolio/academic project meant to be shown.
- **Folders per concern:** api / seed / benchmark / analysis keep each stage independent.
- **`.gitkeep` files:** git does not track empty folders; these placeholders keep the structure visible.
- **`.gitignore`:** keeps `node_modules`, secrets (`.env`) and bulky raw output out of history.

## Iteration 1 - Docker: MongoDB + Redis
- **Docker Compose:** one file describes both services, so `docker compose up -d` gives anyone the same environment. No manual installs, and the study is reproducible.
- **Image versions pinned to major (`mongo:8`, `redis:7-alpine`):** avoids surprise changes mid-experiment. `alpine` is a tiny Linux base, so the image is small.
- **Ports 27017 / 6379 published:** lets the Node API running on the host reach the containers.
- **Mongo volume:** the seeded catalog survives restarts. Re-seeding every time would waste time.
- **Redis persistence off (`--save ""`, `--appendonly no`):** a cache is disposable. Disk snapshots could add latency spikes that would pollute the benchmark numbers.
- **Healthchecks:** Docker reports when each service is actually ready, not just started.

## Iteration 2 - Seed data and index
- **Faker with a fixed seed (`faker.seed(42)`):** every run generates the same catalog, so results can be reproduced.
- **10,000 products:** inside the 5,000-10,000 range from the proposal, and big enough that a collection scan is slower than an index lookup.
- **`productId` field with a unique index:** the API will look products up by this number. Without the index every read would scan the collection and inflate the uncached latency for the wrong reason. The cache has to be compared against a properly indexed database, otherwise the comparison is unfair.
- **Seed script wipes and reloads:** running it twice gives the same state.
- **Index demo (Module 4):** a query on `category` + `price` examined all 10,000 documents without an index and 59 with one (`explain("executionStats")`). At this size the time difference is only a few ms, so the docs-examined count is what shows the effect.
- **`MONGO_URL` and `SEED_COUNT` can be overridden** through environment variables. The defaults work as they are.

## Iteration 3 - API in direct mode
- **Express:** minimal, widely known, and little code between the request and the database. Less framework overhead means the numbers mostly reflect the data layer.
- **Four endpoints, each with a role in the study:** `GET /products/:id` is the main cacheable read, `GET /products?category=` is a heavier read that returns a list, `PUT /products/:id` is the write that will have to invalidate the cache later, and `/health` lets the benchmark check the server is up.
- **One shared Mongo connection:** the driver keeps a connection pool, so every request reuses it. Opening a new connection per request would measure connection setup, not the query.
- **`projection: { _id: 0 }`:** hides MongoDB's internal id. The response then contains only our own fields, and the JSON that gets cached later is the same as what the client sees.
- **`limit` capped at 100:** stops one request from pulling a huge response and skewing the numbers.
- **PUT sets `updatedAt`:** needed later to see whether a cached copy is stale.
- **Express 5 handles async errors:** a failed database call returns a 500 error and does not crash the process, so no try/catch wrappers are needed.
- **Direct mode first, cache second:** this version is the baseline. The cache is added in the next iteration as a switch, so both modes run from one codebase and are compared fairly.

## Iteration 4 - Cache-aside with Redis
- **Cache-aside pattern:** on a read the app checks Redis first. On a hit it returns the stored copy. On a miss it reads MongoDB, stores the result in Redis with a TTL, and returns it. The cache never talks to the database itself, the application does. It is the most common pattern and the one named in the proposal.
- **One codebase, two modes (`CACHE_MODE`):** the same code and the same endpoints run with or without Redis, so the only difference between the two measurements is the cache. In direct mode the Redis connection is never opened. Checked: zero keys are written in direct mode.
- **TTL set with `EX` when the value is stored (`CACHE_TTL`, default 60 s):** Redis removes the key itself. This is the knob for the freshness vs speed experiment.
- **Keys:** `product:<id>` for single products and `list:<category>:<limit>` for lists.
- **Writes: update MongoDB first, then delete the cached key:** the next read repopulates it from the database. Deleting is simpler and safer than overwriting the cached value, because there is no way for the cache to hold a value the database does not. Tested: after a PUT the next GET returned the new price.
- **Lists are not invalidated on a PUT:** a changed product can sit in a cached list until the TTL expires. This is deliberate. Tracking which lists contain which product is a lot of extra logic, and it is a clear example of the staleness the TTL experiment is meant to show.
- **Hits and misses counted in memory (`/stats`):** needed for the hit-ratio charts. The counters reset with `POST /reset`, which also empties Redis, so each benchmark run starts cold. They are per process and are lost on restart, which is fine for a single-server test.
- **Missing products (404) are not cached:** every request for a nonexistent id goes to MongoDB. Noted as a known limitation. It matters for the unique-query workload, where many requests will not be cache hits at all.
- **Cache values stored as JSON strings:** simple, readable in `redis-cli`, and the cost of `JSON.parse` is part of what a cache hit really costs.
