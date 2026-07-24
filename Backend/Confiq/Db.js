const mongoose = require("mongoose");
const dotenv = require("dotenv").config();

const mongoURI = process.env.MONGO_URI

const connectDB = async()=>{
    try {
        await mongoose.connect(mongoURI)
        console.log("MongoDB connected...")
    } catch (error) {
        console.error("Error connecting to MongoDB:", error)
        process.exit(1)
    } 
}

module.exports = connectDB;  