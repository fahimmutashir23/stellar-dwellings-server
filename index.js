const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const nodemailer = require('nodemailer');
const multer = require('multer');
require("dotenv").config();
const cloudinary = require('cloudinary');
const fs = require("fs");
          

const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

cloudinary.v2.config({ 
  cloud_name: process.env.CLOUDINARY_NAME,  
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: 465,
  auth: {
    user: process.env.SMTP_MAIL,
    pass: process.env.SMTP_PASS,
  },
});

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
    // await client.connect();

    const userCollection = client.db("HouseDB").collection("users");
    const bookingCollection = client.db("HouseDB").collection("bookings");
    const houseCollection = client.db("HouseDB").collection("houses");
    const brokerCollection = client.db("HouseDB").collection("brokers");
    const clientCollection = client.db("HouseDB").collection("client");
    const fileCollection = client.db("HouseDB").collection("files");
    const otpCollection = client.db("HouseDB").collection("otp");

    // Send Email Function -----------------------------------------------------------------------
    const sendEmail = async (mailInfo) => {
      const emailFormat = await transporter.sendMail({
        from: "<mdfahim.muntashir28@gmail.com>",
        to: mailInfo.to,
        subject: "OTP Verification",
        html: `
        <p>Welcome to <bold>Stellar Dwellings</bold></p>
        <p>Your OTP code is here:</p>
        <h1 style="color: blue"><bold>${mailInfo.code}</bold></h1>
        `
      });

      transporter.sendMail(emailFormat, (error, info) => {
        if (error) {
          return error
        }
      });
    };

    // Generate OTP ------------------------------------------------------------------------------
    const generateOTP = () => {
      try {
        const OTP = Math.floor(1000 * Math.random()*9)
        return OTP
      } catch (error) {
        return error
      }
    }

    const otpExpiration = async(filter) => {
      const otpExpRes = await otpCollection.deleteOne(filter);
      return otpExpRes;
    }

    // MiddleWere-----------------------------------------------------------------------------------
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
      const result = await userCollection.findOne(filter);
      if (result) {
        if (result.password == password) {
          return res.send({ message: "success",user: {email: email, name: result.firstName+' '+result.lastName} });
        }
        res.send({ message: "failed" });
      }
      res.send({message: 'failed'})
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

    app.get("/singleHouse/:id", async (req, res) => {
      const id = req.params.id;
      const filter = {_id : new ObjectId(id)}
      const result = await houseCollection.findOne(filter);
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

    // Brokers API
    app.get("/brokers", async (req, res) => {
      const result = await brokerCollection.find().toArray();
      res.send(result);
    });

    // Client API
    app.get("/clients", async (req, res) => {
      const result = await clientCollection.find().toArray();
      res.send(result);
    });

    // Upload File Api

    const storage = multer.diskStorage({
      destination: function (req, file, cb) {
        cb(null, './uploads')
      },
      filename: function (req, file, cb) {
        const uniqueSuffix = Date.now()
        cb(null, uniqueSuffix + '_' + file.originalname)
      }
    })
    const upload = multer({ storage: storage })

    
    app.post("/fileUpload", upload.single('video'), async (req, res) => {
      console.log(req.file.path);
      try {
        const result = await cloudinary.uploader.upload(req.file.path, {
          resource_type: "auto",
        });
    console.log(result);
    fs.unlinkSync(req.file.path)
        // const fileInfo = {
        //   url: result.secure_url,
        //   public_id: result.public_id,
        //   type: result.resource_type,
        //   space: result.bytes
        // };
    
        // const data = await fileCollection.insertOne(fileInfo);
        // res.send(data);
      } catch (error) {
        console.error(error);
        fs.unlinkSync(req.file.path)
        // res.status(500).send("Error uploading file to Cloudinary");
      }
    });

    app.get("/fileUpload", async (req, res) => {
      const result = await fileCollection.find().toArray();
      res.send(result);
    });


    // OTP Generate -------------------------------------------------------------------------------------

    app.post('/sendOTP', async(req, res) => {
      const {email} = req.body;
      const filter = {email : email}

      if(filter.email){
        await otpCollection.deleteMany(filter);
      } else{
        return res.send({message: 'Please enter a valid email'})
      }

      const OTP = generateOTP();
      const mailInfo = {
        to: email,
        code: OTP
      }

      sendEmail(mailInfo)
      .then(async () => {
        const result = await otpCollection.insertOne({email: email, otp: OTP})
        res.send({beforeOtpMessage: 'OTP was send your email', result})
        
        setTimeout(() => {
          const res = otpExpiration(filter)
        }, 1 * 60 * 1000);
      })
      .catch(() => {
        res.send({beforeOtpMessage: 'Something went wrong.'})
      })
    })

    app.get("/sendOTP", async (req, res) => {
      const result = await otpCollection.find().toArray();
      res.send(result);
    });

    app.post("/getOTP", async (req, res) => {
      const {email: userEmail, otp: userOtp} = req.body;
      const filter = {email : userEmail};
      const result = await otpCollection.findOne(filter);

      if(result === null){
        return res.send({afterOtpMessage : 'Your OTP has been expired'})
      } else{
          if(userEmail != result.email || userOtp != result.otp){
            return res.send({afterOtpMessage: 'The OTP is not valid'})
          } else{
            res.send({afterOtpMessage: "You are welcome"})
          }
      }
    })

    






    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
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
