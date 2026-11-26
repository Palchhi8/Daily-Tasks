require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const { seedOrdersIfEmpty } = require('./controllers/orderController');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await connectDB();
    await seedOrdersIfEmpty();

    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`Food Delivery Dashboard API running on port ${PORT}`);
      console.log(`Connected to MongoDB Atlas: food_delivery_db`);
      console.log(`Endpoint: http://localhost:${PORT}/api/orders`);
      console.log(`=======================================================`);
    });
  } catch (err) {
    console.error('Failed to start food delivery server:', err);
    process.exit(1);
  }
}

startServer();
