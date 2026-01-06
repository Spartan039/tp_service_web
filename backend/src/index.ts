import 'dotenv/config';
import { prisma } from './utils/db'
import express, { type Request, type Response } from 'express';

const app = express();
const port = 3000;

app.use(express.json());


app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});