require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const bot = require('./bot');
const webhookRoutes = require('./routes/webhookRoutes');
const { startCronJobs } = require('./jobs/cronJobs');

const app = express();
app.use(express.json());

connectDB();
startCronJobs(bot);

app.use('/webhook', webhookRoutes);

app.get('/', (req, res) => res.send('Sure 2 Odds Ultra is running securely!'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
