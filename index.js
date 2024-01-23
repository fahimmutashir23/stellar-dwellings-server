const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pyhg6t2.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const userCollection = client.db("HouseDB").collection("users");
    const bookingCollection = client.db("HouseDB").collection("bookings");
    const houseCollection = client.db("HouseDB").collection("houses");

    // MiddleWere
    const verifyToken = (req, res, next) => {
      const token = req.headers.authorization;
      if (!token) {
        return res.status(401).send({ message: "unauthorize access" });
      }
      jwt.verify(token, process.env.SECRET_TOKEN, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "unauthorize access" });
        }
        req.user = decoded;
        next();
      });
    };

    //user authentication
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.SECRET_KEY, {
        expiresIn: "100h",
      });
      res.send({ token });
    });

    // Authentication API
    app.get("/auth", async (req, res) => {
      const email = req.query.email;
      const password = req.query.password;

      const filter = { email: email };
      const findUser = await userCollection.findOne(filter);
      if (findUser) {
        if (findUser.password == password) {
          return res.send({ message: "success" });
        }
        res.send({ message: "failed" });
      }
    });

    // user related API
    app.get("/users", async (req, res) => {
      const email = req.query.email;
      let user;
      if (email) {
        user = { email: email };
      }
      const result = await userCollection.find(user).toArray();
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const filter = { email: user.email };
      const findMail = await userCollection.findOne(filter);
      if (findMail) {
        return res.send({ message: "email already exist" });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // Bookings API
    app.post("/bookings", async (req, res) => {
      const info = req.body;
      const result = await bookingCollection.insertOne(info);
      res.send(result);
    });

    app.get("/bookings", async (req, res) => {
      const email = req.query.email;
      let query;
      if (email) {
        query = { email: email };
      }
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(filter);
      res.send(result);
    });

    // House
    app.get("/totalHouse", async (req, res) => {
      const count = await houseCollection.estimatedDocumentCount();
      res.send({ count });
    });

    app.post("/houses", async (req, res) => {
      const info = req.body;
      const result = await houseCollection.insertOne(info);
      res.send(result);
    });

    app.get("/houses", async (req, res) => {
      const page = parseInt(req.query.page);
      const limit = parseInt(req.query.limit);
      const price = parseInt(req.query.price);
      const search = req.query.search;

      let query;
      if (price) {
        query = { rent_price: { $lte: price } };
      }
      if (search) {
        query = {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { city: { $regex: search, $options: "i" } },
            { bedroom: parseInt(search) },
            { bathroom: parseInt(search) },
            { available_date: { $gte: search } },
          ],
        };
      }

      const result = await houseCollection
        .find(query)
        .skip(page * limit)
        .limit(limit)
        .toArray();
      res.send(result);
    });

    app.delete("/houses/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await houseCollection.deleteOne(filter);
      res.send(result);
    });

    app.put("/houses/:id", async (req, res) => {
      const id = req.params.id;
      const info = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          name: info.name,
          ownerEmail: "taslimit23@gmail.com",
          city: info.city,
          address: info.address,
          bathroom: info.bathroom,
          bedroom: info.bedroom,
          room_size: info.room_size,
          available_date: info.available_date,
          rent_price: info.rent_price,
          phone_number: info.phone_number,
          description: info.description,
          image: info.image,
        },
      };
      const result = await houseCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

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

app.get("/", (req, res) => {
  res.send("Rent is running");
});

app.listen(port, () => {
  console.log(`Rent is running on port ${port}`);
});
