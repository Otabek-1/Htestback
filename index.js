const express = require("express");
const dotenv = require("dotenv");
const authRouter = require("./Controllers/auth");
const app = express();
const cors = require('cors');


dotenv.config();
app.use(express.json());
app.use(cors());
app.use('/api/auth', authRouter);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));