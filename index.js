const express = require('express')
const cors = require('cors');
const app = express();
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const port = process.env.PORT || 3000

// middleware
app.use(express.json());
app.use(cors());

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

        // User collection
        const userCollection = db.collection('users');

        // users related apis
        app.post('/users', async (req, res) => {
            const user = req.body;
            user.role = 'user';
            user.createdAt = new Date();

            const email = user.email;
            const userExists = await userCollection.findOne({ email })

            if(userExists){
                return res.send({message: 'user exists'})
            }

            const result = await userCollection.insertOne(user);
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
        // Ensures that the client will close when you finish/error
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
