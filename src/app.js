import express from 'express';
import contentRouter from './routes/content.route.js';
import GlobalErrorHandler from './middlewares/globalErr.middleware.js';

const app = express();

// body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', contentRouter)
app.use(GlobalErrorHandler)

export default app;