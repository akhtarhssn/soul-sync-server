const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const jwt = require("jsonwebtoken");

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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

    const verifyInstructor = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);

      if (user?.role !== "Instructor") {
        return res
          .status(403)
          .send({ error: true, message: "Forbidden access" });
      }
      next();
    };

    const verifyStudent = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);

      if (user?.role !== "Student") {
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

    // Verify User role:
    app.get("/users/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        return res
          .status(403)
          .send({ error: true, message: "Forbidden access" });
      }

      const query = { email: email };
      const user = await usersCollection.findOne(query);

      const result = { admin: user?.role === "Admin" };
      res.send(result);
    });

    app.get("/users/instructor/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        return res
          .status(403)
          .send({ error: true, message: "Forbidden access" });
      }

      const query = { email: email };
      const user = await usersCollection.findOne(query);

      const result = { instructor: user?.role === "Instructor" };
      res.send(result);
    });

    app.get("/users/student/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        return res
          .status(403)
          .send({ error: true, message: "Forbidden access" });
      }

      const query = { email: email };
      const user = await usersCollection.findOne(query);

      const result = { instructor: user?.role === "Student" };
      res.send(result);
    });

    // Instructor API's:
    app.post("/add-class", verifyJWT, verifyInstructor, async (req, res) => {
      const classBody = req.body;

      // console.log("Received classBody:", classBody);

      const result = await classesCollection.insertOne(classBody);
      // console.log("Result of insertOne:", result);

      res.send(result);
    });

    // change classes status:
    app.patch("/class-status/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const { id } = req.params;
      const { value } = req.body;

      const filter = { _id: new ObjectId(id) };
      const update = { $set: { status: value } };

      const result = await classesCollection.updateOne(filter, update);
      res.send(result);
    });

    app.get(
      "/instructor-classes",
      verifyJWT,
      verifyInstructor,
      async (req, res) => {
        const email = req.query.email;

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

        // Now collect only selected Instructor class item
        const query = { instructor_email: email };
        const result = await classesCollection.find(query).toArray();
        res.send(result);
      }
    );

    // All Bookings API:
    // Add booking/classes
    app.post("/bookings", verifyJWT, verifyStudent, async (req, res) => {
      const classes = req.body;

      const result = await bookingsCollection.insertOne(classes);
      res.send(result);
    });

    app.get("/my-bookings", verifyJWT, verifyStudent, async (req, res) => {
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

    // delete booking Item:
    app.delete("/delete-booking/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      const result = await bookingsCollection.deleteOne(query);
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
