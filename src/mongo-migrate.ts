import { MongoClient, ServerApiVersion } from "mongodb";
import { users } from "./db/schema";
import { db } from "./db/db";
import { env } from "./env";
import { getLogger } from "./log";

const log = getLogger("mongo-migrate");

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(env.MONGODB_URI, {
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
        log.warn(
          { zID: entry.data.zid, discordUser: entry.data.discord_name, fullName: entry.data.extra_data.person_name },
          "Duplicate zID found",
        );
      }
    }

    log.info({ userCount }, "Migration complete");
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}
run().catch((err) => log.error(err, "Migration failed"));
