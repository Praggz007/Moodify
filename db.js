const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.log('db.js: MONGODB_URI not set; skipping Mongo client creation');
}

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = MONGODB_URI ? new MongoClient(MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
}) : null;

let connected = false;

async function connect() {
  if (!client) throw new Error('MONGODB_URI not configured');
  if (!connected) {
    await client.connect();
    connected = true;
    console.log('db.js: Mongo client connected');
  }
  return client;
}

async function getCollection(dbName = 'moodify', collName = 'mood_logs') {
  const c = await connect();
  return c.db(dbName).collection(collName);
}

module.exports = { connect, getCollection, ObjectId, client };
