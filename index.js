const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.pcfhua9.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const verifyJWT = (req, res, next) => {
  console.log('you jut hit verify JWT');
  const authorization = req.headers.authorization;
  console.log(authorization);
  if (!authorization) {
    return res.status(401).send({
      error: true,
      message: 'Unauthorized Access',
    });
  }
  const token = authorization.split(' ')[1];
  console.log(token);
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
    if (error) {
      return res
        .status(403)
        .send({ error: true, message: 'Unauthorized Access' });
    }
    req.decoded = decoded;
    next();
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const serviceCollection = client.db('carDoctor').collection('services');
    const checkoutCollection = client.db('carDoctor').collection('checkout');

    //jwt
    app.post('/jwt', (req, res) => {
      const user = req.body;
      console.log(user);
      //const token = jwt.sign(payload, secret key, expiring date)
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1h',
      });
      //send token as object. otherwise when we will try to covert the response to json(res=>res.json()) it will generate error. Because a string cannot be a json data
      res.send({ token });
    });

    //services routes
    app.get('/services', async (req, res) => {
      const cursor = serviceCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get('/services/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      const options = {
        // it will show only those fields which are written in projection. value 1 means we want, 0 means we dont want
        projection: { title: 1, price: 1, service_id: 1, img: 1 },
      };
      const result = await serviceCollection.findOne(query, options);
      res.send(result);
    });

    //bookings routes
    app.get('/bookings', verifyJWT, async (req, res) => {
      const decoded = req.decoded;

      if (decoded.email !== req.query.email) {
        return res
          .status(403)
          .send({ error: true, message: 'Access Forbidden' });
      }
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      console.log(req.headers);
      const result = await checkoutCollection.find(query).toArray();
      res.send(result);
    });

    app.post('/checkout', async (req, res) => {
      const checkoutdata = req.body;
      console.log(checkoutdata);

      const result = await checkoutCollection.insertOne(checkoutdata);
      //console.log(result);
      res.send(result);
    });

    app.patch('/bookings/:id', async (req, res) => {
      const id = req.params.id;
      const updatedBookingData = req.body;
      const query = { _id: new ObjectId(id) };
      const updateBooking = {
        $set: {
          status: updatedBookingData.status,
        },
      };
      const result = await checkoutCollection.updateOne(query, updateBooking);
      console.log(result);
      res.send(result);
    });

    app.delete('/bookings/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await checkoutCollection.deleteOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 });
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Car doctor server running');
});

app.listen(port, () => {
  console.log(`Car doctor is running on port: ${port}`);
});
