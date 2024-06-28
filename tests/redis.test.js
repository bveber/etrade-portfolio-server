import RedisCache from '../src/services/redis';

describe('RedisCache', () => {
    let redisCache = new RedisCache();

    afterEach(async () => {
        // Clean up any cached data after each test
        await redisCache.clearAll();
    });

    afterAll(async () => {
        // Close the Redis connection after all tests
        await redisCache.quit();
    });

    it('should get a value from cache', async () => {
        const key = 'testKey';
        const value = {'key': 'testValue'};
        // Set the value in cache
        await redisCache.set(key, value );

        // Get the value from cache
        const result = await redisCache.get(key);
        expect(result).toEqual(value);
    });

    it('should return null if key does not exist in cache', async () => {
        const key = 'nonExistentKey';

        // Get the value from cache
        const result = await redisCache.get(key);

        expect(result).toBeNull();
    });

    it('should set a value in cache', async () => {
        const key = 'testKey';
        const value = {'key': 'testValue'};

        // Set the value in cache
        await redisCache.set(key, value);

        // Get the value from cache
        const result = await redisCache.get(key);

        expect(result).toEqual(value);
    });

    it('should set a value in cache with a custom TTL', async () => {
        const key = 'testKey';
        const value = {'key': 'testValue'};
        const ttl = 60; // 1 minute
        // Set the value in cache with custom TTL
        await redisCache.set(key, value, ttl);

        // Get the value from cache
        const result = await redisCache.get(key);

        expect(result).toEqual(value);
    });

    it('should clear a key from cache', async () => {
        const key = 'testKey';
        const value = {'key': 'testValue'};

        // Set the value in cache
        await redisCache.set(key, value);

        // Clear the key from cache
        await redisCache.clearKey(key);

        // Get the value from cache
        const result = await redisCache.get(key);

        expect(result).toBeNull();
    });

    it('should clear all keys from cache', async () => {
        const key1 = 'testKey1';
        const value1 = {'key': 'testValue1'};
        const key2 = 'testKey2';
        const value2 = {'key': 'testValue2'};
        const key3 = 'testKey3';
        const value3 = {'key': 'testValue3'};
        // Set the values in cache
        await redisCache.set(key1, value1);
        await redisCache.set(key2, value2);
        await redisCache.set(key3, value3);

        // Clear all keys from cache
        await redisCache.clearAll();

        // Get the values from cache
        const result1 = await redisCache.get(key1);
        const result2 = await redisCache.get(key2);
        const result3 = await redisCache.get(key3);

        expect(result1).toBeNull();
        expect(result2).toBeNull();
        expect(result3).toBeNull();
    });

    it('should throw an error when clearing all keys in a non-test environment', async () => {
        // Set the db to a non-test environment
        redisCache.db = 2;

        // Clear all keys from cache
        await expect(redisCache.clearAll()).rejects.toThrow('Cannot clear all keys in active environment. This method is only available in the test');
        redisCache.db = 1
    });

    it('should handle errors when getting a value from cache', async () => {
        const key = 'testKey';
        const errorMessage = 'Error getting value from Redis';
        // Mock the Redis get method to throw an error
        redisCache.client.get = jest.fn(() => { throw new Error(errorMessage); });

        // Get the value from cache
        await expect(redisCache.get(key)).rejects.toThrow(errorMessage);
    }); 

    it('should handle errors when setting a value in cache', async () => {
        const key = 'testKey';
        const value = {'key': 'testValue'};
        const errorMessage = 'Error setting value in Redis';
        // Mock the Redis set method to throw an error
        redisCache.client.set = jest.fn(() => { throw new Error(errorMessage); });

        // Set the value in cache
        await expect(redisCache.set(key, value)).rejects.toThrow(errorMessage);
    });

    it('should handle errors when clearing a key from cache', async () => {
        const key = 'testKey';
        const errorMessage = 'Error clearing key in Redis';
        // Mock the Redis del method to throw an error
        redisCache.client.del = jest.fn(() => { throw new Error(errorMessage); });

        // Clear the key from cache
        await expect(redisCache.clearKey(key)).rejects.toThrow(errorMessage);
    });

    it('should handle errors when clearing all keys in Redis', async () => {
        const errorMessage = 'Error clearing all keys in Redis';
        let newRedisCache = new RedisCache();
        // Mock the Redis flushDb method to throw an error
        // redisCache.client.flushDb = jest.fn(() => { throw new Error(errorMessage); });
        const flushDbMock = jest.fn().mockRejectedValue(new Error(errorMessage));
        newRedisCache.client.flushDb = flushDbMock;

        // Clear all keys from cache
        await expect(newRedisCache.clearAll()).rejects.toThrow(errorMessage);

        // Reset the mock
        flushDbMock.mockRestore();
        await newRedisCache.quit();
    });

    it('should handle errors when quitting the Redis connection', async () => {
        const errorMessage = 'Error closing connection to Redis';
        
        // Mock the Redis quit method to throw an error
        const quitMock = jest.spyOn(redisCache.client, 'quit').mockImplementation(() => {
            throw new Error(errorMessage);
        });

        // Quit the Redis connection
        await expect(redisCache.quit()).rejects.toThrow(errorMessage);

        // Restore the mock to its original implementation
        quitMock.mockRestore();
    });

    it('should handle errors when connecting to Redis', async () => {
        const errorMessage = 'Error connecting to Redis';
        let newRedisCache = new RedisCache();
        // Mock the Redis connect method to throw an error
        var connectMock = jest.fn().mockRejectedValue(new Error(errorMessage));
        newRedisCache.client.connect = connectMock;

        // Connect to Redis
        await expect(newRedisCache.connect()).rejects.toThrow(errorMessage);

        // Reset the mock
        // newRedisCache.client.connect.mockRestore();
        await newRedisCache.quit();
    });

});