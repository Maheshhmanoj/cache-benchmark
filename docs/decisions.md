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
