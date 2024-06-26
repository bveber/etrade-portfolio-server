import { createClient } from 'redis';

class RedisCache {
    constructor(ttl = 86400) { // Default TTL of 1 day in seconds
        this.ttl = ttl;
        this.client = createClient();

        this.client.on('error', (err) => console.error('Redis Client Error', err));

        // Connect to Redis
        (async () => {
            await this.client.connect();
        })();
    }

    async get(key) {
        try {
            const value = await this.client.get(key);
            if (value) {
                console.log('Cache hit');
                return JSON.parse(value);
            } else {
                console.log('Cache miss');
                return null;
            }
        } catch (err) {
            console.error('Error getting value from Redis:', err);
            throw err;
        }
    }

    async set(key, value) {
        try {
            await this.client.set(key, value, {
                EX: this.ttl,
            });
        } catch (err) {
            console.error('Error setting value in Redis:', err);
            throw err;
        }
    }
}

export default RedisCache;