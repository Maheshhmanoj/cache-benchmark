import { MongoClient } from "mongodb";
import { faker } from "@faker-js/faker";

const url = process.env.MONGO_URL ?? "mongodb://localhost:27017";
const count = Number(process.env.SEED_COUNT ?? 10000);

const categories = ["electronics", "books", "clothing", "home", "toys", "sports", "beauty", "garden"];

faker.seed(42);

const products = Array.from({ length: count }, (_, i) => ({
  productId: i + 1,
  name: faker.commerce.productName(),
  category: faker.helpers.arrayElement(categories),
  brand: faker.company.name(),
  price: Number(faker.commerce.price({ min: 5, max: 2000 })),
  stock: faker.number.int({ min: 0, max: 500 }),
  rating: faker.number.float({ min: 1, max: 5, fractionDigits: 1 }),
  description: faker.commerce.productDescription(),
  updatedAt: new Date(),
}));

const client = new MongoClient(url);
await client.connect();
const collection = client.db("cachebench").collection("products");

await collection.deleteMany({});
await collection.insertMany(products);
await collection.createIndex({ productId: 1 }, { unique: true });

console.log(`inserted ${await collection.countDocuments()} products`);
await client.close();

