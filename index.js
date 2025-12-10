const express = require('express')
const cors = require('cors');
const app = express();
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');

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

        // packages api (GET)
        app.get('/packages', async (req, res) => {
            try {
                const result = await decorationServicesCollection.find().toArray();
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Failed to load packages", error });
            }
        });

        // all services api(GET) with search / filter / limit
        // GET /packages with search, category, minPrice, maxPrice, sort, page, limit
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

        // Endpoint to get unique categories (for filter dropdown)
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
