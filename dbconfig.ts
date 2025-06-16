import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const dbURI = `mongodb+srv://${process.env.DBUSERNAME}:${process.env.DBPASSWORD}@${process.env.CLUSTER}.mongodb.net/${process.env.DB}?retryWrites=true&w=majority&appName=Cluster0`;

export const connectDB = async () => {

    await mongoose.connect(dbURI);
    console.log('Connected to Hwil');
};

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});