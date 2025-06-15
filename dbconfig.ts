import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Add additional connection parameters to handle IP restrictions
const dbURI = `mongodb+srv://${process.env.DBUSERNAME}:${process.env.DBPASSWORD}@${process.env.CLUSTER}.mongodb.net/${process.env.DB}?retryWrites=true&w=majority&authSource=admin&ssl=true&appName=Cluster0`;

export const connectDB = async () => {
    try {
        // Add connection options to improve reliability
        await mongoose.connect(dbURI, {
            serverSelectionTimeoutMS: 15000, // Timeout after 15 seconds
            socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        });
        console.log('Connected to Hwil');
    } catch (error) {
        console.error('Failed to connect to MongoDB:', error);
        throw error; // Rethrow to allow the caller to handle it
    }
};

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconnected');
});
