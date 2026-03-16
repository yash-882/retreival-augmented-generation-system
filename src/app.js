import express from 'express';
import contentrouter from './routes/content.route.js';
import GlobalErrorHandler from './middlewares/globalErr.middleware.js';

const app = express();

app.use('/api', contentrouter)
app.use(GlobalErrorHandler)

export default app;