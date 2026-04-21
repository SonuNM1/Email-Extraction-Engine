import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import scraperRoutes from './routes/scraper.routes.js';
import excelRoutes from './routes/excel.routes.js';

const app = express();

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || origin.includes('localhost') || origin.includes('devtunnels.ms')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

app.use('/api/scrape', scraperRoutes);
app.use('/api/excel', excelRoutes);

export default app;