require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const { seedCoworkingData } = require('./controllers/bookingController');

const PORT = process.env.PORT || 3000;

async function bootstrap() {
  try {
    // 1. Connect to MongoDB Atlas
    await connectDB();

    // 2. Seed initial coworking rooms and accounts
    await seedCoworkingData();

    // 3. Start HTTP server
    const server = app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(` Coworking Room Scheduler running on port ${PORT}`);
      console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(` API Base: http://localhost:${PORT}/api`);
      console.log(`====================================================`);
    });

    return server;
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  bootstrap();
}

module.exports = { bootstrap };
