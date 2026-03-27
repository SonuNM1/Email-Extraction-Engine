import express from "express";
import scraperRoutes from "./routes/scraper.routes.js";

const app = express();

// middleware 

app.use(express.json());

// connect route

app.use("/api/scraper", scraperRoutes);

export default app;