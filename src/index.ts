import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db";
import router from "./router/routes";
import cors from "cors";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

connectDB();

app.use(express.json());
app.use(cors());
app.use("/", router);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});