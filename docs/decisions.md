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
