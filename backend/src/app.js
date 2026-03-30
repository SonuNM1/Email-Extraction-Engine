import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import scraperRoutes from './routes/scraper.routes.js';

dotenv.config();

const app = express();

app.use(cors(
    {
        origin: 'http://localhost:5173', 
        credentials: true 
    }
));
app.use(express.json());
app.use(cookieParser());

app.use('/api/scrape', scraperRoutes);

const PORT = process.env.PORT || 5000;

// Connect to MongoDB FIRST, then start the server

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});

export default app 