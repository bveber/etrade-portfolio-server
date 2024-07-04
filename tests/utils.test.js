import { RateLimiter } from '../src/services/utils';

describe('RateLimiter', () => {
    let rateLimiter;

    beforeEach(() => {
        rateLimiter = new RateLimiter(2); // Set the maximum calls per second to 2
    });

    afterEach(() => {
        jest.useRealTimers(); // Restore the real timers after each test
    });

    test('should limit the number of calls per second', async () => {
        const mockFn = jest.fn();

        // Call the rate-limited function 3 times within 1 second
        rateLimiter.call(mockFn);
        rateLimiter.call(mockFn);
        rateLimiter.call(mockFn);

        // Wait for 1 second to ensure the rate limit is enforced
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Call the rate-limited function 2 more times after the 1-second delay
        rateLimiter.call(mockFn);
        rateLimiter.call(mockFn);

        // The mock function should have been called 2 times (the maximum allowed)
        expect(mockFn).toHaveBeenCalledTimes(2);
    });

    test('should process the queue in order', async () => {
        const mockFn = jest.fn();

        // Call the rate-limited function 3 times
        rateLimiter.call(mockFn, 1);
        rateLimiter.call(mockFn, 2);
        rateLimiter.call(mockFn, 3);

        // // The mock function should not have been called yet
        expect(mockFn).toHaveBeenCalledTimes(1);

        // Wait for the rate limiter to process the queue
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // The mock function should have been called 3 times in order
        expect(mockFn).toHaveBeenCalledTimes(3);
        expect(mockFn.mock.calls).toEqual([[1], [2], [3]]);
    });
});