import withCache, { RedisClientHandler } from '../src/services/redis';

describe('RedisClientHandler', () => {
    let redisClient = new RedisClientHandler();

    afterEach(async () => {
        // Clean up any cached data after each test
        await redisClient.clearAll();
    });

    afterAll(async () => {
        // Close the Redis connection after all tests
        await redisClient.quit();
    });

    it('should get a value from cache', async () => {
        const key = 'testKey';
        const value = { 'key': 'testValue' };
        // Set the value in cache
        await redisClient.set(key, value );

        // Get the value from cache
        const result = await redisClient.get(key);
        expect(result).toEqual(value);
    });

    it('should return null if key does not exist in cache', async () => {
        const key = 'nonExistentKey';

        // Get the value from cache
        const result = await redisClient.get(key);

        expect(result).toBeNull();
    });

    it('should set a value in cache', async () => {
        const key = 'testKey';
        const value = { 'key': 'testValue' };

        // Set the value in cache
        await redisClient.set(key, value);

        // Get the value from cache
        const result = await redisClient.get(key);

        expect(result).toEqual(value);
    });

    it('should set a value in cache with a custom TTL', async () => {
        const key = 'testKey';
        const value = { 'key': 'testValue' };
        const ttl = 60; // 1 minute
        // Set the value in cache with custom TTL
        await redisClient.set(key, value, ttl);

        // Get the value from cache
        const result = await redisClient.get(key);

        expect(result).toEqual(value);
    });

    it('should set a value in cache with "undefined" ttl', async () => {
        const key = 'testKey';
        const value = { 'key': 'testValue' };
        const ttl = 'undefined';
        const setSpy = jest.spyOn(redisClient, 'set');

        await redisClient.set(key, value, ttl);
        // Check if set method is called with the default TTL
        expect(setSpy).toHaveBeenCalledWith(key, value, ttl);

        // Get the value from cache
        const result = await redisClient.get(key);

        expect(result).toEqual(value);
    });

    it('should clear a key from cache', async () => {
        const key = 'testKey';
        const value = { 'key': 'testValue' };

        // Set the value in cache
        await redisClient.set(key, value);

        // Clear the key from cache
        await redisClient.clearKey(key);

        // Get the value from cache
        const result = await redisClient.get(key);

        expect(result).toBeNull();
    });

    it('should clear all keys from cache', async () => {
        const key1 = 'testKey1';
        const value1 = { 'key': 'testValue1' };
        const key2 = 'testKey2';
        const value2 = { 'key': 'testValue2' };
        const key3 = 'testKey3';
        const value3 = { 'key': 'testValue3' };
        // Set the values in cache
        await redisClient.set(key1, value1);
        await redisClient.set(key2, value2);
        await redisClient.set(key3, value3);

        // Clear all keys from cache
        await redisClient.clearAll();

        // Get the values from cache
        const result1 = await redisClient.get(key1);
        const result2 = await redisClient.get(key2);
        const result3 = await redisClient.get(key3);

        expect(result1).toBeNull();
        expect(result2).toBeNull();
        expect(result3).toBeNull();
    });

    it('should throw an error when clearing all keys in a non-test environment', async () => {
        // Set the db to a non-test environment
        redisClient.db = 2;

        // Clear all keys from cache
        await expect(redisClient.clearAll()).rejects.toThrow('Cannot clear all keys in active environment. This method is only available in the test');
        redisClient.db = 1;
    });

    it('should handle errors when getting a value from cache', async () => {
        const key = 'testKey';
        const errorMessage = 'Error getting value from Redis';
        // Mock the Redis get method to throw an error
        redisClient.client.get = jest.fn(() => { throw new Error(errorMessage); });

        // Get the value from cache
        await expect(redisClient.get(key)).rejects.toThrow(errorMessage);
    });

    it('should handle errors when setting a value in cache', async () => {
        const key = 'testKey';
        const value = { 'key': 'testValue' };
        const errorMessage = 'Error setting value in Redis';
        // Mock the Redis set method to throw an error
        redisClient.client.set = jest.fn(() => { throw new Error(errorMessage); });

        // Set the value in cache
        await expect(redisClient.set(key, value)).rejects.toThrow(errorMessage);
    });

    it('should handle errors when clearing a key from cache', async () => {
        const key = 'testKey';
        const errorMessage = 'Error clearing key in Redis';
        // Mock the Redis del method to throw an error
        redisClient.client.del = jest.fn(() => { throw new Error(errorMessage); });

        // Clear the key from cache
        await expect(redisClient.clearKey(key)).rejects.toThrow(errorMessage);
    });

    it('should handle errors when clearing all keys in Redis', async () => {
        const errorMessage = 'Error clearing all keys in Redis';
        let newRedisClient = new RedisClientHandler();

        // Mock the Redis flushDb method to throw an error
        const flushDbMock = jest.fn().mockRejectedValue(new Error(errorMessage));
        newRedisClient.client.flushDb = flushDbMock;

        // Clear all keys from cache
        await expect(newRedisClient.clearAll()).rejects.toThrow(errorMessage);

        // Reset the mock
        flushDbMock.mockRestore();
        await newRedisClient.quit();
    });

    it('should handle errors when quitting the Redis connection', async () => {
        const errorMessage = 'Error closing connection to Redis';

        // Mock the Redis quit method to throw an error
        const quitMock = jest.spyOn(redisClient.client, 'quit').mockImplementation(() => {
            throw new Error(errorMessage);
        });

        // Quit the Redis connection
        await expect(redisClient.quit()).rejects.toThrow(errorMessage);

        // Restore the mock to its original implementation
        quitMock.mockRestore();
    });

    it('should handle errors when connecting to Redis', async () => {
        const errorMessage = 'Error connecting to Redis';
        let newRedisClient = new RedisClientHandler();
        // Mock the Redis connect method to throw an error
        var connectMock = jest.fn().mockRejectedValue(new Error(errorMessage));
        newRedisClient.client.connect = connectMock;

        // Connect to Redis
        await expect(newRedisClient.connect()).rejects.toThrow(errorMessage);

        // Reset the mock
        await newRedisClient.quit();
    });

});

describe('withCache', () => {
    let redisClient;

    beforeEach(async () => {
        redisClient = new RedisClientHandler();
    });

    afterEach(async () => {
        await redisClient.clearAll();
        await redisClient.quit();
    });


    it('should cache the result of a function', async () => {
        const key = 'testKey';
        const value = { 'key': 'testValue' };
        const ttl = 60; // 1 minute
        const keyGenerator = () => key;
        const fn = () => value;

        const cachedFn = withCache(keyGenerator, ttl, redisClient)(fn);

        // Call the function
        const result = await cachedFn();

        // Get the value from cache
        const cachedValue = await redisClient.get(key);

        expect(result).toEqual(value);
        expect(cachedValue).toEqual(value);
    });

    it('should cache the result of a function with a custom TTL', async () => {
        const key = 'testKey';
        const value = { 'key': 'testValue' };
        const ttl = 60; // 1 minute
        const keyGenerator = () => key;
        const fn = () => value;
        const setSpy = jest.spyOn(redisClient, 'set');

        const cachedFn = withCache(keyGenerator, ttl, redisClient)(fn);

        // Call the function
        const result = await cachedFn();

        // Get the value from cache
        const cachedValue = await redisClient.get(key);

        expect(result).toEqual(value);
        expect(cachedValue).toEqual(value);
        expect(setSpy).toHaveBeenCalledWith(key, value, ttl);
    });

    it('should get the value from cache if available', async () => {
        const key = 'testKey';
        const value = { 'key': 'testValue' };
        const newRedisClient = new RedisClientHandler();
        await newRedisClient.set(key, value);
        const keyGenerator = () => key;
        const fn = jest.fn(() => value);

        const cachedFn = withCache(keyGenerator, undefined, redisClient)(fn);

        const result = await cachedFn();
        expect(result).toEqual(value);
        newRedisClient.quit();
    });

    it('should handle errors when getting a value from cache', async () => {
        const key = 'testKey';
        const errorMessage = 'Error getting value from Redis';
        const keyGenerator = () => key;
        const fn = () => { throw new Error(errorMessage); };
        const cachedFn = withCache(keyGenerator, undefined, redisClient)(fn);

        // Call the function
        await expect(cachedFn()).rejects.toThrow(errorMessage);
    });

});