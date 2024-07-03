import { createClient } from 'redis';

export class RedisClientHandler {
    constructor() {
        this.db = process.env.NODE_ENV === 'test' ? 1 : 0;
        this.redisOptions = {
            socket: {
                host: process.env.REDIS_HOST || '127.0.0.1',
                port: process.env.REDIS_PORT || 6379,
            },
            database: this.db,
        };
        this.client = createClient(this.redisOptions);

        this.client.on('error', (err) => console.error('Redis Client Error', err));

        // Connect to Redis
        this.connect();

    }

    async connect() {
        try {
            await this.client.connect();
        } catch (err) {
            // console.error('Error connecting to Redis:', err);
            throw err;
        }
    }

    async get(key) {
        console.log(`Getting value from Redis db ${this.db}:, ${key}`);
        try {
            const value = await this.client.get(key);
            if (value) {
                console.log('Cache hit');
                return JSON.parse(value);
            } else {
                console.log('Cache miss for key:', key);
                return null;
            }
        } catch (err) {
            // console.error('Error getting value from Redis:', err);
            throw err;
        }
    }

    async set(key, value, ttl = 86400) {
        try {
            await this.client.set(key, JSON.stringify(value), {
                EX: ttl,
            });
        } catch (err) {
            // console.error('Error setting value in Redis:', err);
            throw err;
        }
    }

    async clearKey(key) {
        try {
            await this.client.del(key);
        } catch (err) {
            // console.error('Error clearing key in Redis:', err);
            throw err;
        }
    }

    async clearAll() {
        if (this.db !== 1) {
            throw new Error('Cannot clear all keys in active environment. This method is only available in the test');
        }
        try {
            await this.client.flushDb();
        } catch (err) {
            // console.error('Error clearing all keys in Redis:');
            throw err;
        }
    }

    async quit() {
        try {
            await this.client.quit();
        } catch (err) {
            // console.error('Error closing connection to Redis:', err);
            throw err;
        }
    }

}

// const withCache = (fn, { keyGenerator, ttl, redisClient }) => async (...args) => {
const withCache = (keyGenerator, ttl=86400, redisClient=new RedisClientHandler()) => (fn) => async (...args) => {
    console.log('withCache args:', args);
    console.log('withCache keyGenerator:', keyGenerator);
    console.log('withCache ttl:', ttl);
    console.log('withCache redisClient:', redisClient);
    try {
        const cacheKey = keyGenerator(...args);
        const cachedValue = await redisClient.get(cacheKey);
        console.log('withCache cacheKey:', cacheKey);
        console.log('withCache cachedValue:', cachedValue);
        if (cachedValue) {
            console.log('Cache hit');
            return cachedValue;
        }

        const result = await fn(...args);
        console.log('Cache miss, setting cache');
        await redisClient.set(cacheKey, result, ttl); // cache for specified ttl
        console.log('Cache set. Quitting Redis client');
        return result;
    }
    catch (error) {
        console.log('withCache error:', error);
        throw error;
    }
};


export default withCache;