import { MongoClient, ServerApiVersion } from "mongodb";
import "dotenv/config";
import { users } from "./db/schema";
import { db } from "./db/db";
const uri = process.env.MONGODB_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  let userCount = 0;
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const lyn_db = client.db("lyn");
    const verificationData = await lyn_db
      .collection("verify")
      .find({})
      .toArray();

    for (const entry of verificationData) {
      const user: typeof users.$inferInsert = {
        snowflake: entry.snowflake,
        discordUser: entry.data.discord_name,
        zID: entry.data.zid,
        name: entry.data.extra_data.person_name,
        distro: entry.data.extra_data.fave_distro,
        verifiedAt: Math.floor(entry.data.verif_timestamp),
      };

      try {
        await db.insert(users).values(user);
        userCount++;
      } catch {
        console.log(
          `Duplicate zID! zID: ${entry.data.zid}, discord username: ${entry.data.discord_name}, full name: ${entry.data.extra_data.person_name}`,
        );
      }
    }

    console.log(`Migrated ${userCount} users.`);
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}
run().catch(console.dir);
