const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
  }
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
      expiresIn: "10h",
    });
    res.send({ token });
  });

  
      // Authentication API
      app.get("/authentication", async (req, res) => {
        const email = req.query.email;
        const password = req.query.password;

        if(email && password){
            const filter = {email : email}
            const findUser = await userCollection.findOne(filter)
            if(findUser){
                if(findUser.password === password){
                    return res.send({message: 'success'})
                } else{
                    return res.send({message: 'failed'})
                }
            }
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
        const filter = {email : email}
        const result = await bookingCollection.find(filter).toArray();
        res.send(result);
      });

      app.delete("/bookings/:id", async (req, res) => {
        const id = req.params.id;
        const filter = {_id : new ObjectId(id)}
        const result = await bookingCollection.deleteOne(filter);
        res.send(result);
      });

      app.put("/bookings/:id", async (req, res) => {
        const id = req.params.id;
        const info = req.body;
        const filter = {_id : new ObjectId(id)}
        const updateDoc = {
            $set : {

            }
        }
        const result = await bookingCollection.updateOne(filter, updateDoc);
        res.send(result);
      });

      // House
      app.post("/houses", async (req, res) => {
        const info = req.body;
        const result = await houseCollection.insertOne(info);
        res.send(result);
      });

      app.get("/houses", async (req, res) => {
        const result = await houseCollection.find(filter).toArray();
        res.send(result);
      });





   
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
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
