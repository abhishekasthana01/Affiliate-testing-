const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const connectDB = async () => {
  try {
    let mongoUri = process.env.MONGO_URI;

    if (process.env.USE_IN_MEMORY_DB === 'true' && process.env.NODE_ENV !== 'production') {
      const mongod = await MongoMemoryServer.create();
      mongoUri = mongod.getUri();
      console.log('Using In-Memory MongoDB');
    }

    if (!mongoUri) {
      throw new Error('MONGO_URI is not defined in production environment');
    }

    const conn = await mongoose.connect(mongoUri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
