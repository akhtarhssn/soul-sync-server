const express = require("express");
require("dotenv").config();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const app = express();

const { MongoClient, ServerApiVersion } = require("mongodb");
const port = process.env.PORT || 5000;

// Middleware:
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "UnAuthorized Access" });
  }
  // split token (bearer token)
  const token = authorization.split(" ")[1];
  // console.log(token);

  jwt.verify(token, process.env.SECRET_TOKEN, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

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
    const usersCollection = client.db("swagSwayDb").collection("users");
    const classesCollection = client.db("swagSwayDb").collection("classes");
    const bookingsCollection = client.db("swagSwayDb").collection("bookings");

    app.post("/jwt", (req, res) => {
      const user = req.body;

      const token = jwt.sign(user, process.env.SECRET_TOKEN, {
        expiresIn: "2h",
      });
      res.send({ token });
    });

    // verify admin middleware
    // WARNING: use verifyJWT before verifyAdmin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);

      if (user?.role !== "Admin") {
        return res
          .status(403)
          .send({ error: true, message: "Forbidden access" });
      }
      next();
    };

    // classes API:
    app.get("/all-classes", async (req, res) => {
      const result = await classesCollection.find().toArray();
      res.send(result);
    });

    // Users api:
    // Get all users
    app.get("/instructor", async (req, res) => {
      const query = { role: "Instructor" };

      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });

    // post new user to database
    app.post("/users", async (req, res) => {
      const user = req.body;

      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);

      if (existingUser) {
        return "";
      }

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // All Bookings API:
    // Add booking/classes
    app.post("/bookings", async (req, res) => {
      const classes = req.body;

      const result = await bookingsCollection.insertOne(classes);
      res.send(result);
    });

    app.get("/my-bookings", verifyJWT, async (req, res) => {
      const email = req.query.email;
      // console.log(email);

      // Return if no email found
      if (!email) {
        res.send([]);
      }

      // Verify if the given email match the token email
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res
          .status(403)
          .send({ error: true, message: "Forbidden access" });
      }

      // Now collect only selected user data/booking item
      const query = { studentEmail: email };
      const result = await bookingsCollection.find(query).toArray();
      res.send(result);
    });

    // test bookings. checking if the bookings item does return anything:

    // app.get("/lookout", async (req, res) => {
    //   const email = req.query.email;
    //   const query = { studentEmail: email };
    //   const result = await bookingsCollection.find(query).toArray();
    //   res.send(result);
    // });

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
