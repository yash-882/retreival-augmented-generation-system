import { createClient } from 'redis';

// client to connect to Redis
const redisClient = createClient({
    username: 'default',
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
        reconnectStrategy: (retries) => {
            console.log('Redis connection retries: ', retries);
            
            // stop reconnecting to redis
            if(retries >= 10) return false

            // exponential delay before each retry: 50 -> 100 -> 150 -> ...upto 2000ms
            return Math.min(retries * 50, 2000);
        }
    }
});

export default redisClient;