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

        this.connect();

    }

    async connect() {
        try {
            await this.client.connect();
        } catch (err) {
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
            throw err;
        }
    }

    async set(key, value, ttl = 86400) {
        try {
            await this.client.set(key, JSON.stringify(value), {
                EX: ttl,
            });
        } catch (err) {
            throw err;
        }
    }

    async clearKey(key) {
        try {
            await this.client.del(key);
        } catch (err) {
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
            throw err;
        }
    }

    async quit() {
        try {
            await this.client.quit();
        } catch (err) {
            throw err;
        }
    }

}

const withCache = (keyGenerator, ttl, redisClient) => (fn) => async (...args) => {
    try {
        const [firstArg] = args;
        const cacheKey = keyGenerator(firstArg);
        const cachedValue = await redisClient.get(cacheKey);
        if (cachedValue) {
            return cachedValue;
        }

        const result = await fn(...args);
        await redisClient.set(cacheKey, result, ttl); // cache for specified ttl
        return result;
    }
    catch (error) {
        throw error;
    }
};


export default withCache;