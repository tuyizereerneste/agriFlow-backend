import express from "express";
import cors from "cors";
import path from "path";
import router from "./src/router/routes";

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api", router);

export default app;