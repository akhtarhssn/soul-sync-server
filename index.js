const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();

const { MongoClient, ServerApiVersion } = require("mongodb");
const port = process.env.PORT || 5000;

// Middleware:
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Soul Sync server is running");
});

const uri = `mongodb+srv://${process.env.SOUL_SYNC_USER}:${process.env.SOUL_SYNC_PASS}@cluster0.a0pfpbg.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    client.connect();

    // All Database Collection:
    const classesCollection = client.db("swagSwayDb").collection("classes");

    // classes API:
    app.get("/all-classes", async (req, res) => {
      const result = await classesCollection.find().toArray();
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(
    `Bistro Boss Server is Running in on Port: http://localhost:${port}`
  );
});
