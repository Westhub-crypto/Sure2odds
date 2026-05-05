require("dotenv").config();
const express = require("express");
const connectDB = require("./config/db");

const app = express();
app.use(express.json());

connectDB();

app.use("/api", require("./routes/webhookRoutes"));

require("./jobs/cronJobs");

app.listen(3000, () => console.log("Server running"));
