const express = require("express")
const dotenv = require("dotenv").config()
const mongoose = require("mongoose")
const cors = require("cors")
const connectDB = require("./Confiq/Db")
const readdirSync = require("fs").readdirSync
// const studentsRoutes = require("./routes/studentsRoutes")


connectDB()
const app = express()

app.use(cors())

app.use(express.json())

app.use(express.json())
 readdirSync("routes").map((r) => {
    app.use("/", require(`./routes/${r}`))
})


// app.use("/api/students", studentsRoutes);


app.get("/", (req, res) => { 
  res.json({
    message: "TCC Student ID API is running",
  });
});


const PORT = process.env.PORT || 5000 
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}...`)  
})