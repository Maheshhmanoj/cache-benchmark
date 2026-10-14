import express from "express";
import { MongoClient } from "mongodb";

const url = process.env.MONGO_URL ?? "mongodb://localhost:27017";
const port = Number(process.env.PORT ?? 3000);

const client = new MongoClient(url);
await client.connect();
const products = client.db("cachebench").collection("products");

const app = express();
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/products/:id", async (req, res) => {
  const product = await products.findOne(
    { productId: Number(req.params.id) },
    { projection: { _id: 0 } }
  );
  if (!product) return res.status(404).json({ error: "not found" });
  res.json(product);
});

app.get("/products", async (req, res) => {
  const { category } = req.query;
  const limit = Math.min(Number(req.query.limit ?? 20), 100);
  const filter = category ? { category } : {};
  const list = await products.find(filter, { projection: { _id: 0 } }).limit(limit).toArray();
  res.json(list);
});

app.put("/products/:id", async (req, res) => {
  const { price, stock } = req.body;
  const changes = { updatedAt: new Date() };
  if (price !== undefined) changes.price = price;
  if (stock !== undefined) changes.stock = stock;

  const updated = await products.findOneAndUpdate(
    { productId: Number(req.params.id) },
    { $set: changes },
    { returnDocument: "after", projection: { _id: 0 } }
  );
  if (!updated) return res.status(404).json({ error: "not found" });
  res.json(updated);
});

app.listen(port, () => {
  console.log(`api listening on ${port}`);
});
