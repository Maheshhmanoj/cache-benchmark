# cache-benchmark

Impact of workload characteristics on cache effectiveness: a Redis-MongoDB benchmarking study.

We build a small product-catalog API on **MongoDB**, add **Redis** in front of it (cache-aside pattern), and measure when the cache helps, by how much, and when it stops helping.

## Objectives
1. Implement a Redis cache layer over MongoDB.
2. Measure latency and throughput with and without the cache.
3. Analyse how read/write ratio, concurrency, cache hit ratio and TTL affect performance.
4. Conclude when caching is worth using and when it is not.

## Tech stack
| Part | Choice |
|---|---|
| Database | MongoDB |
| Cache | Redis |
| Environment | Docker Compose |
| Backend | Node.js + Express |
| Data | Synthetic product catalog (Faker), 5,000-10,000 records |
| Load testing | autocannon |
| Analysis | Python (pandas, matplotlib) |

## Repo layout
- `api/` - Express API (direct and cached modes)
- `seed/` - data generation scripts
- `benchmark/` - load-test runner
- `analysis/` - charts and result tables
- `docs/` - decision log and write-up

## Roadmap
- [x] 0. Repo setup
- [x] 1. Docker: MongoDB + Redis
- [x] 2. Seed data + index
- [ ] 3. API, direct mode
- [ ] 4. API, cache-aside mode
- [ ] 5. Benchmark harness
- [ ] 6. Experiments
- [ ] 7. Analysis and charts
- [ ] 8. Write-up


## Quick start
```bash
docker compose up -d      # start MongoDB (27017) and Redis (6379)
docker compose ps         # both should say "healthy"
docker compose down       # stop (data in the mongo volume is kept)
```

## Seeding
```bash
npm install
npm run seed         # 10,000 fake products into MongoDB (db: cachebench)
npm run index-demo   # same query with and without an index
```
