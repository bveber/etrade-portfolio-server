import { getStockData } from '../src/routes/yahooFinance';
import yahooFinance from 'yahoo-finance2';
import { yahooFinanceKeyGenerator, yahooFinanceTtl } from '../src/services/utils';

jest.mock('yahoo-finance2');

describe('Yahoo Finance Service', () => {
    let redisClient;

    beforeAll(() => {
        // Mock Redis client
        redisClient = {
            get: jest.fn(),
            set: jest.fn(),
            quit: jest.fn(),
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return cached data if available', async () => {
        const ticker = 'AAPL';
        const cachedData = { name: 'Apple Inc.' };

        redisClient.get.mockResolvedValue(cachedData);

        const result = await getStockData(ticker, yahooFinanceKeyGenerator, yahooFinanceTtl, redisClient);

        expect(redisClient.get).toHaveBeenCalledWith(yahooFinanceKeyGenerator(ticker));
        expect(result).toEqual(cachedData);
    });

    it('should fetch data from Yahoo Finance API and cache it if not in cache', async () => {
        const ticker = 'AAPL';
        const apiData = { name: 'Apple Inc.' };

        redisClient.get.mockResolvedValue(null);
        const mockQuoteSummay = yahooFinance.quoteSummary.mockResolvedValue(apiData);

        const result = await getStockData(ticker, yahooFinanceKeyGenerator, yahooFinanceTtl, redisClient);

        expect(redisClient.get).toHaveBeenCalledWith(yahooFinanceKeyGenerator(ticker));
        expect(yahooFinance.quoteSummary).toHaveBeenCalledWith(ticker, { modules: ['assetProfile', 'summaryDetail', 'defaultKeyStatistics', 'financialData'] });
        expect(redisClient.set).toHaveBeenCalledWith(yahooFinanceKeyGenerator(ticker), apiData, 3600);
        expect(result).toEqual(apiData);
        mockQuoteSummay.mockRestore();
    });

    it('should throw an error if Yahoo Finance API call fails', async () => {
        const ticker = 'AAPL';
        const error = new Error('API call failed');

        redisClient.get.mockResolvedValue(null);
        yahooFinance.quoteSummary.mockRejectedValue(error);

        await expect(getStockData(ticker, yahooFinanceKeyGenerator, yahooFinanceTtl, redisClient)).rejects.toThrow(`Error fetching data for ${ticker}: ${error.message}`);

        expect(redisClient.get).toHaveBeenCalledWith(yahooFinanceKeyGenerator(ticker));
        expect(yahooFinance.quoteSummary).toHaveBeenCalledWith(ticker, { modules: ['assetProfile', 'summaryDetail', 'defaultKeyStatistics', 'financialData'] });
    });
});
