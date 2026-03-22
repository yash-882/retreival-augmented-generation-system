//load enviroment variables
import "../loadEnvVars.js";

import app from "./app.js";
import { PrismaClient } from '../prisma/generated/prisma/client.ts';
import { PrismaPg } from '@prisma/adapter-pg';
import redisClient from "./configs/redis.config.js";

let isRedisAlive = true;
// listens for redis error event
redisClient.on('error', (err) => {
    console.log('Redis Client Error', err);
    
    isRedisAlive = false;
});

// prisma DB config (postgresql)
const prismaClient = new PrismaClient({
    adapter: new PrismaPg({
        connectionString: process.env.DATABASE_URL
    })
})


async function startServer() {
    
    try {
        await prismaClient.$executeRaw`SELECT 1` // verify database connection (PostgreSQL)
        console.log('Connected to PostgreSQL'); 
        
        const redisConn = await redisClient.connect(); // connect to Redis
        console.log('Connected to Redis');

        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => console.log(`Listening to PORT: ${PORT}`));

        return { redisClient: redisConn };
    }
    catch (err) {
        console.log('Error while starting the server', err);

        // prevent app shutdown on redis errors
        const REDIS_DOWN_ERRORS = ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT'];
        
        if(REDIS_DOWN_ERRORS.includes(err.code)){
            isRedisAlive = false
        }
        
        else {
            console.log('Shutting down the server...');
            process.exit(1); // close app
        }
    }
}

const {redisClient: redis} = await startServer()

export {redis, prismaClient, isRedisAlive}