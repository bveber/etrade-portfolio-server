import { getStock } from '../src/routes/stock';

describe('getStock', () => {
    let redisClient;

    beforeEach(() => {
        redisClient = {}; // Mock Redis client
    });

    afterEach(() => {
        // Clean up any test-specific Redis data
    });

    it('should return stock data from Finnhub API and Yahoo Finance', async () => {
        const ticker = 'AAPL';

        // Mock the getCompanyData and getStockData functions
        jest.mock('../src/routes/finnhubApi.js', () => ({
            getCompanyData: jest.fn().mockResolvedValue(null),
        }));

        jest.mock('../src/routes/yahooFinance.js', () => ({
            getStockData: jest.fn().mockResolvedValue(null),
        }));

        jest.mock('../src/routes/edgar.js', () => ({
            get10k: jest.fn().mockResolvedValue(null),
        }));

        const result = await getStock(ticker, redisClient);

        expect(result).toEqual({ filings: null, finnhub: null, yahooFinance: null });
    });


    it('should not return an error if there is an issue with Finnhub API', async () => {
        const ticker = 'AAPL';

        // Mock the getCompanyData function to throw an error
        jest.mock('../src/routes/finnhubApi.js', () => ({
            getCompanyData: jest.fn().mockRejectedValue(new Error('Finnhub API error')),
        }));

        jest.mock('../src/routes/yahooFinance.js', () => ({
            getStockData: jest.fn(),
        }));

        jest.mock('../src/routes/edgar.js', () => ({
            get10k: jest.fn(),
        }));

        const result = await getStock(ticker, redisClient);
        expect(result).toEqual({ filings: null, finnhub: null, yahooFinance: null });
    });

    it('should not return an error if there is an issue with Yahoo Finance API', async () => {
        const ticker = 'AAPL';

        // Mock the getStockData function to throw an error
        jest.mock('../src/routes/finnhubApi.js', () => ({
            getCompanyData: jest.fn(),
        }));

        jest.mock('../src/routes/yahooFinance.js', () => ({
            getStockData: jest.fn().mockRejectedValue(new Error('Yahoo Finance API error')),
        }));

        jest.mock('../src/routes/edgar.js', () => ({
            get10k: jest.fn(),
        }));

        const result = await getStock(ticker, redisClient);
        expect(result).toEqual({ filings: null, finnhub: null, yahooFinance: null });
    });

    it('should not return an error if there is an issue with Edgar API', async () => {
        const ticker = 'AAPL';

        // Mock the get10k function to throw an error
        jest.mock('../src/routes/finnhubApi.js', () => ({
            getCompanyData: jest.fn(),
        }));

        jest.mock('../src/routes/yahooFinance.js', () => ({
            getStockData: jest.fn(),
        }));

        jest.mock('../src/routes/edgar.js', () => ({
            get10k: jest.fn().mockRejectedValue(new Error('Edgar API error')),
        }));

        const result = await getStock(ticker, redisClient);
        expect(result).toEqual({ filings: null, finnhub: null, yahooFinance: null });
    });
});