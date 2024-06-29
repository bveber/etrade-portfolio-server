import { getStockData } from '../src/routes/yahooFinance';
import { quoteSummary } from 'yahoo-finance2';
import RedisClientHandler from '../src/services/redis';

jest.mock('yahoo-finance2', () => {
    return {
        quoteSummary: jest.fn(),
    };
});
jest.mock('../src/services/redis');

describe('Yahoo Finance Service', () => {
    let redisClient;
    // let quoteSummary;

    beforeAll(() => {
        // Mock Redis client
        redisClient = {
            get: jest.fn(),
            set: jest.fn(),
        };
        RedisClientHandler.mockImplementation(() => redisClient);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return cached data if available', async () => {
        const symbol = 'AAPL';
        const cachedData = { name: 'Apple Inc.' };

        redisClient.get.mockResolvedValue(cachedData);

        const result = await getStockData(symbol);

        expect(redisClient.get).toHaveBeenCalledWith(`yahooFinance:getStockData:${symbol}`);
        expect(result).toEqual(cachedData);
    });

    it('should fetch data from Yahoo Finance API and cache it if not in cache', async () => {
        const symbol = 'AAPL';
        const apiData = { name: 'Apple Inc.' };

        redisClient.get.mockResolvedValue(null);
        quoteSummary.mockResolvedValue(apiData);
        console.log(await quoteSummary(symbol, { modules: ['assetProfile', 'summaryDetail', 'defaultKeyStatistics', 'financialData'] }));

        const result = await getStockData(symbol);

        expect(redisClient.get).toHaveBeenCalledWith(`yahooFinance:getStockData:${symbol}`);
        expect(quoteSummary).toHaveBeenCalledWith(symbol, { modules: ['assetProfile', 'summaryDetail', 'defaultKeyStatistics', 'financialData'] });
        expect(redisClient.set).toHaveBeenCalledWith(`yahooFinance:getStockData:${symbol}`, apiData, 3600);
        expect(result).toEqual(apiData);
    });

    it('should throw an error if Yahoo Finance API call fails', async () => {
        const symbol = 'AAPL';
        const error = new Error('API call failed');

        redisClient.get.mockResolvedValue(null);
        quoteSummary.mockRejectedValue(error);

        await expect(getStockData(symbol)).rejects.toThrow(`Error fetching data for ${symbol}: ${error.message}`);

        expect(redisClient.get).toHaveBeenCalledWith(`yahooFinance:getStockData:${symbol}`);
        expect(quoteSummary).toHaveBeenCalledWith(symbol, { modules: ['assetProfile', 'summaryDetail', 'defaultKeyStatistics', 'financialData'] });
    });
});
