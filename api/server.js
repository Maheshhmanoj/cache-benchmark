import express from "express";
import { MongoClient } from "mongodb";
import { createClient } from "redis";

const mongoUrl = process.env.MONGO_URL ?? "mongodb://localhost:27017";
const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
const port = Number(process.env.PORT ?? 3000);
const useCache = process.env.CACHE_MODE === "cache";
const ttl = Number(process.env.CACHE_TTL ?? 60);

const mongo = new MongoClient(mongoUrl);
await mongo.connect();
const products = mongo.db("cachebench").collection("products");

let redis;
if (useCache) {
  redis = createClient({ url: redisUrl });
  await redis.connect();
}

let hits = 0;
let misses = 0;

async function cached(key, load) {
  if (!useCache) return load();
  const stored = await redis.get(key);
  if (stored) {
    hits++;
    return JSON.parse(stored);
  }
  misses++;
  const value = await load();
  if (value) await redis.set(key, JSON.stringify(value), { EX: ttl });
  return value;
}

const app = express();
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ ok: true, mode: useCache ? "cache" : "direct" });
});

app.get("/stats", (req, res) => {
  const total = hits + misses;
  res.json({ mode: useCache ? "cache" : "direct", ttl, hits, misses, hitRatio: total ? hits / total : 0 });
});

app.post("/reset", async (req, res) => {
  hits = 0;
  misses = 0;
  if (useCache) await redis.flushDb();
  res.json({ ok: true });
});

app.get("/products/:id", async (req, res) => {
  const id = Number(req.params.id);
  const product = await cached(`product:${id}`, () =>
    products.findOne({ productId: id }, { projection: { _id: 0 } })
  );
  if (!product) return res.status(404).json({ error: "not found" });
  res.json(product);
});

app.get("/products", async (req, res) => {
  const { category } = req.query;
  const limit = Math.min(Number(req.query.limit ?? 20), 100);
  const filter = category ? { category } : {};
  const list = await cached(`list:${category ?? "all"}:${limit}`, () =>
    products.find(filter, { projection: { _id: 0 } }).limit(limit).toArray()
  );
  res.json(list);
});

app.put("/products/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { price, stock } = req.body;
  const changes = { updatedAt: new Date() };
  if (price !== undefined) changes.price = price;
  if (stock !== undefined) changes.stock = stock;

  const updated = await products.findOneAndUpdate(
    { productId: id },
    { $set: changes },
    { returnDocument: "after", projection: { _id: 0 } }
  );
  if (!updated) return res.status(404).json({ error: "not found" });
  if (useCache) await redis.del(`product:${id}`);
  res.json(updated);
});

app.listen(port, () => {
  console.log(`api listening on ${port} in ${useCache ? "cache" : "direct"} mode`);
});
