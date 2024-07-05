import { getStockData, getChartData, getNewsData } from '../src/routes/yahooFinance';
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

    describe('getStockData', () => {

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

    describe('getChartData', () => {
        it('should fetch chart data from Yahoo Finance API', async () => {
            const ticker = 'AAPL';
            const period1 = '2020-01-01';
            const interval = '1mo';
            const apiData = { chart: [] };

            const mockChart = yahooFinance.chart.mockResolvedValue(apiData);

            const result = await getChartData(ticker, period1, interval);

            expect(yahooFinance.chart).toHaveBeenCalledWith(ticker, { period1, interval });
            expect(result).toEqual(apiData);
            mockChart.mockRestore();
        });

        it('should throw an error if Yahoo Finance API call fails', async () => {
            const ticker = 'AAPL';
            const period1 = '2020-01-01';
            const interval = '1mo';
            const error = new Error('API call failed');

            yahooFinance.chart.mockRejectedValue(error);

            await expect(getChartData(ticker, period1, interval)).rejects.toThrow(`Error fetching data for ${ticker}: ${error.message}`);

            expect(yahooFinance.chart).toHaveBeenCalledWith(ticker, { period1, interval });
        });

        it('should use default values for period1 and interval if not provided', async () => {
            const ticker = 'AAPL';
            const apiData = { chart: [] };

            const mockChart = yahooFinance.chart.mockResolvedValue(apiData);

            const result = await getChartData(ticker);

            expect(yahooFinance.chart).toHaveBeenCalledWith(ticker, { period1: '2020-01-01', interval: '1mo' });
            expect(result).toEqual(apiData);
            mockChart.mockRestore();
        });

    });

    describe('getNewsData', () => {
        it('should fetch news data from Yahoo Finance API', async () => {
            const ticker = 'AAPL';
            const newsCount = 25;
            const apiData = { news: [] };

            const mockSearch = yahooFinance.search.mockResolvedValue(apiData);

            const result = await getNewsData(ticker, newsCount);

            expect(yahooFinance.search).toHaveBeenCalledWith(ticker, { newsCount });
            expect(result).toEqual(apiData.news);
            mockSearch.mockRestore();
        });

        it('should throw an error if Yahoo Finance API call fails', async () => {
            const ticker = 'AAPL';
            const newsCount = 25;
            const error = new Error('API call failed');

            yahooFinance.search.mockRejectedValue(error);

            await expect(getNewsData(ticker, newsCount)).rejects.toThrow(`Error fetching data for ${ticker}: ${error.message}`);

            expect(yahooFinance.search).toHaveBeenCalledWith(ticker, { newsCount });
        });

        it('should use default value for newsCount if not provided', async () => {
            const ticker = 'AAPL';
            const apiData = { news: [] };

            const mockSearch = yahooFinance.search.mockResolvedValue(apiData);

            const result = await getNewsData(ticker);

            expect(yahooFinance.search).toHaveBeenCalledWith(ticker, { newsCount: 25 });
            expect(result).toEqual(apiData.news);
            mockSearch.mockRestore();
        });
    });
});
