const express = require('express')
const cors = require('cors');
const app = express();
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE__SEC);

const port = process.env.PORT || 3000

const trackingId = new ObjectId().toString();
console.log(trackingId);

const admin = require("firebase-admin");

const serviceAccount = require("./styledecor-firebase-adminsdk.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

// middleware
app.use(express.json());
app.use(cors());

// jwt middleware
const verifyFBToken = async (req, res, next) => {
    // console.log('headers in middleware console', req.headers?.authorization)
    const token = req.headers.authorization;

    if (!token) {
        return res.status(401).send({ message: 'unauthorized access' })
    }

    try {
        const idToken = token.split(' ')[1];
        const decoded = await admin.auth().verifyIdToken(idToken)
        console.log('decoded in the token', decoded);
        req.decoded_email = decoded.email;
        next();
    }
    catch (err) {
        return res.status(401).send({ message: 'unauthorized access' })
    }

}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.y6dazfp.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: false,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const db = client.db('style_deco_db');
        const decorationServicesCollection = db.collection('packages');
        const allDecorationServiceCol = db.collection('services');
        const bookingsCollection = db.collection('bookings');

        // User collection db
        const userCollection = db.collection('users');

        // decorators collection db
        const decoratorsCollection = db.collection('decorators');

        // payment history db
        const paymentCollection = db.collection('payments');

        // middleware admin before allowing admin activity
        // must be used after verifyFBToken middleware
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded_email;
            const query = { email };
            const user = await userCollection.findOne(query);

            if (!user || user.role !== 'admin') {
                return res.status(403).send({ message: 'forbidden access' });
            }

            next();
        }


        // users related apis to get the all users from database for the role
        app.get('/users', verifyFBToken, async (req, res) => {
            const cursor = userCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        })

        // users related apis to change the role as admin
        app.patch('/users/:id/role', verifyFBToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const roleInfo = req.body;
            const query = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    role: roleInfo.role
                }
            }
            const result = await userCollection.updateOne(query, updatedDoc);
            res.send(result);
        })

        // users related apis to store in database for the role
        app.post('/users', async (req, res) => {
            const user = req.body;
            user.role = 'user';
            user.createdAt = new Date();

            const email = user.email;
            const userExists = await userCollection.findOne({ email })

            if (userExists) {
                return res.send({ message: 'user exists' })
            }

            const result = await userCollection.insertOne(user);
            res.send(result);
        })

        // user get by email for role
        app.get('/users/:email/role', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await userCollection.findOne(query);

            // if (!user) {
            //     return res.status(404).send({ message: "User not found" });
            // }

            res.send({ role: user?.role || 'user' });
        });


        // decorators related apis get
        // ApproveDecorators
        app.get('/decorators', async (req, res) => {
            const query = {}
            if (req.query.status) {
                query.status = req.query.status;
            }
            const cursor = decoratorsCollection.find(query)
            const result = await cursor.toArray();
            res.send(result);
        })

        // decorators related apis update status pending to approved and user role update
        // ApproveDecorators
        app.patch('/decorators/:id', verifyFBToken, async (req, res) => {
            const { id } = req.params;
            const { status } = req.body;
            const result = await decoratorsCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: { status } }
            );
            if (status === 'approved') {
                const email = req.body.email;
                const userQuery = { email }
                const updateUser = {
                    $set: {
                        role: 'decorator'
                    }
                }
                const userResult = await userCollection.updateOne(userQuery, updateUser);
            }

            res.send(result);
        });

        // decorators related apis delete status
        // ApproveDecorators
        app.delete("/decorators/:id", async (req, res) => {
            try {
                const id = req.params.id;
                const result = await decoratorsCollection.deleteOne({ _id: new ObjectId(id) });

                if (result.deletedCount === 0) {
                    return res.status(404).send({ message: "Decorator not found" });
                }

                res.send({ message: "Decorator deleted successfully", result });
            } catch (error) {
                res.status(500).send({ message: "Failed to delete decorator", error });
            }
        });


        // decorators related apis post
        // Decorators
        app.post('/decorators', async (req, res) => {
            const decorator = req.body;
            decorator.status = 'pending';
            decorator.createdAt = new Date();

            const result = await decoratorsCollection.insertOne(decorator);
            res.send(result);
        })


        // Home section(Our Decoration Packages) packages api (GET 12 data)
        app.get('/packages', async (req, res) => {
            try {
                const result = await decorationServicesCollection.find().toArray();
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Failed to load packages", error });
            }
        });

        // all services api(GET) with search / filter / limit (21 Data)
        // GET /services with search, category, minPrice, maxPrice, sort, page, limit
        app.get('/services', async (req, res) => {
            try {
                const {
                    search = '',
                    category,
                    minPrice,
                    maxPrice,
                    sort = 'asc', // asc or desc (based on price)
                    page = 1,
                    limit = 9
                } = req.query;

                const query = {};

                // Text search on title (case-insensitive)
                if (search) {
                    query.title = { $regex: search, $options: 'i' };
                }

                // Category filter
                if (category && category !== 'All') {
                    query.category = category;
                }

                // Price range filter
                if (minPrice || maxPrice) {
                    query.price = {};
                    if (minPrice) query.price.$gte = parseInt(minPrice, 10);
                    if (maxPrice) query.price.$lte = parseInt(maxPrice, 10);
                }

                // Build cursor
                let cursor = allDecorationServiceCol.find(query);

                // Sorting (by price)
                const sortOrder = sort === 'asc' ? 1 : -1;
                cursor = cursor.sort({ price: sortOrder });

                // Pagination
                const pageInt = parseInt(page, 10);
                const limitInt = parseInt(limit, 10);
                const skip = (pageInt - 1) * limitInt;

                const total = await allDecorationServiceCol.countDocuments(query);
                const packages = await cursor.skip(skip).limit(limitInt).toArray();

                res.send({
                    data: packages,
                    total,
                    page: pageInt,
                    limit: limitInt,
                    totalPages: Math.ceil(total / limitInt),
                });
            } catch (error) {
                console.error('GET /packages error:', error);
                res.status(500).send({ message: 'Failed to load packages', error });
            }
        });

        // To get unique categories (for filter dropdown) json : category filter
        app.get('/categories', async (req, res) => {
            try {
                const categories = await allDecorationServiceCol.distinct("category");

                res.send(categories);
            } catch (error) {
                console.error("GET /categories error:", error);
                res.status(500).send({
                    message: "Failed to load categories",
                    error: error.message
                });
            }
        });

        // allServices book now button api to get (single service) into details page
        app.get("/services/:id", async (req, res) => {
            const { id } = req.params;
            try {
                const service = await allDecorationServiceCol.findOne({ _id: new ObjectId(id) });
                if (!service) return res.status(404).send({ message: "Service not found" });
                res.send(service);
            } catch (err) {
                res.status(500).send({ message: "Failed to fetch service", error: err });
            }
        });


        // booking post api
        // by clicking Book Now Service Details Page save booking data into MongoDB
        // collection name (bookings)
        app.post("/bookings", async (req, res) => {
            try {
                const bookingData = req.body;
                const result = await bookingsCollection.insertOne(bookingData);
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Failed to create booking", error });
            }
        });

        // booking get api by email
        // Get all bookings of a specific user
        app.get("/bookings/:email", async (req, res) => {
            try {
                const email = req.params.email;

                const bookings = await bookingsCollection
                    .find({ customerEmail: email })
                    .sort({ bookingDate: 1 }) // sort by nearest date
                    .toArray();

                res.send(bookings);

            } catch (error) {
                res.status(500).send({ message: "Failed to load bookings", error });
            }
        });


        // booking for payment get api for certain services
        app.get("/bookings/id/:id", async (req, res) => {
            try {
                const id = req.params.id;
                const booking = await bookingsCollection.findOne({ _id: new ObjectId(id) });
                res.send(booking);
            } catch (error) {
                res.status(500).send({ message: "Failed to get booking", error });
            }
        });


        // booking delete/cancel api by id
        app.delete("/bookings/:id", async (req, res) => {
            try {
                const id = req.params.id;
                const result = await bookingsCollection.deleteOne({ _id: new ObjectId(id) });
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Failed to delete booking", error });
            }
        });


        // payment related apis
        // payment create via stripe
        app.post('/create-checkout-session', async (req, res) => {
            const paymentInfo = req.body;
            const amount = paymentInfo.price;
            const session = await stripe.checkout.sessions.create({
                line_items: [
                    {
                        price_data: {
                            currency: 'USD',
                            unit_amount: amount,
                            product_data: {
                                name: paymentInfo.serviceTitle
                            }
                        },

                        quantity: 1,
                    },
                ],
                customer_email: paymentInfo.customerEmail,
                mode: 'payment',
                metadata: {
                    serviceId: paymentInfo.serviceId,
                    serviceTitle: paymentInfo.serviceTitle
                },
                success_url: `${process.env.SITE_DOMAIN}/dashboard/payment-success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${process.env.SITE_DOMAIN}/dashboard/payment-cancelled`,
            })

            console.log(session)
            res.send({ url: session.url })
        })

        // payment status update and store to database history called collection payments
        app.patch('/payment-success', async (req, res) => {
            const sessionId = req.query.session_id;
            // console.log('session id', sessionId);
            const session = await stripe.checkout.sessions.retrieve(sessionId);
            // console.log('session retrieve', session)

            const transactionId = session.payment_intent;
            const query = { transactionId: transactionId }

            const paymentExist = await paymentCollection.findOne(query);
            console.log(paymentExist);
            if (paymentExist) {
                return res.send({
                    message: 'already exits',
                    transactionId,
                    trackingId: paymentExist.trackingId
                })
            }

            if (session.payment_status === 'paid') {
                const id = session.metadata.serviceId;
                const query = { _id: new ObjectId(id) }
                const update = {
                    $set: {
                        status: 'Paid',
                        trackingId: trackingId
                    }
                }
                const result = await bookingsCollection.updateOne(query, update);

                const payment = {
                    amount: session.amount_total,
                    currency: session.currency,
                    customerEmail: session.customer_email,
                    serviceId: session.metadata.serviceId,
                    serviceTitle: session.metadata.serviceTitle,
                    transactionId: session.payment_intent,
                    paymentStatus: session.payment_status,
                    paidAt: new Date(),
                    trackingId: trackingId

                }
                if (session.payment_status === 'paid') {
                    const resultPayment = await paymentCollection.insertOne(payment);
                    res.send({
                        success: true,
                        modifyService: result,
                        trackingId: trackingId,
                        transactionId: session.payment_intent,
                        paymentInfo: resultPayment
                    })
                }

                // res.send(result)
            }

            res.send({ success: false })
        })


        // payment history get from collection: payments to show in ui payment history
        //payment history
        app.get('/payments', verifyFBToken, async (req, res) => {
            const email = req.query.email;
            const query = {}

            // console.log('server headers', req.headers);

            if (email) {
                query.customerEmail = email;

                // check email address
                if (email !== req.decoded_email) {
                    return res.status(403).send({ message: 'forbidden access' })
                }
            }
            const cursor = paymentCollection.find(query).sort({ paidAt: -1 });
            const result = await cursor.toArray();
            res.send(result);
        })






        // thunder client test data first api
        app.post('/packages', async (req, res) => {
            const package = req.body;
            const result = await decorationServicesCollection.insertOne(package);
            res.send(result);
        })


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('StyleDecor Your Home Decoration Service!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
