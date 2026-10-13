import { MongoClient } from "mongodb";

const url = process.env.MONGO_URL ?? "mongodb://localhost:27017";
const client = new MongoClient(url);
await client.connect();
const collection = client.db("cachebench").collection("products");

async function measure(label) {
  const stats = await collection
    .find({ category: "books", price: { $lt: 100 } })
    .explain("executionStats");
  const s = stats.executionStats;
  console.log(
    `${label}: scanned ${s.totalDocsExamined} docs, returned ${s.nReturned}, ${s.executionTimeMillis} ms`
  );
}

await collection.dropIndex("category_1_price_1").catch(() => {});
await measure("without index");

await collection.createIndex({ category: 1, price: 1 });
await measure("with index   ");

await client.close();
