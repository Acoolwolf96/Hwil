import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const dbURI = `mongodb+srv://${process.env.DBUSERNAME}:${process.env.DBPASSWORD}@${process.env.CLUSTER}.mongodb.net/${process.env.DB}?retryWrites=true&w=majority&appName=${process.env.APP_NAME}`;

export const connectDB = async () => {
    try {
        await mongoose.connect(dbURI, {
            serverSelectionTimeoutMS: 15000,
        });
        console.log(' Connected to Hwil');
    } catch (error) {
        console.error('MongoDB connection error:', error);
    }
};

mongoose.connection.on('error', (err) => {
    console.error('MongoDB runtime error:', err);
});
