const mongoose = require('mongoose');

const DEFAULT_URI = 'mongodb+srv://jainpalchhi2k6_db_user:TeCS9Z2UAj3GKlQg@cluster0.kwbl0mw.mongodb.net/volunteer_coordination_db?retryWrites=true&w=majority';

/**
 * Connects to MongoDB Atlas cluster
 */
async function connectDB(customUri = null) {
  const uri = customUri || process.env.MONGO_URI || DEFAULT_URI;

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000
    });
    console.log(`[DB] Connected to MongoDB Atlas: ${conn.connection.host} / Database: ${conn.connection.name}`);
    return conn;
  } catch (err) {
    console.error(`[DB ERROR] Failed to connect to MongoDB Atlas:`, err.message);
    throw err;
  }
}

module.exports = connectDB;
