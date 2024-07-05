import yahooFinance from 'yahoo-finance2';
import withCache from '../services/redis.js';

// Get data for a stock
const getStockDataWithoutCache = async function (ticker) {
    try {
        const queryOptions = { modules: ['assetProfile', 'summaryDetail', 'defaultKeyStatistics', 'financialData']  }; // defaults
        const data = await yahooFinance.quoteSummary(ticker, queryOptions);

        return data;
    } catch (error) {
        throw new Error(`Error fetching data for ${ticker}: ${error.message}`);
    }
};

// Export the function with caching
const getStockData = (ticker, keyGenerator, ttl, redisClient) => withCache(keyGenerator, ttl, redisClient)(getStockDataWithoutCache)(ticker);

const getChartData = async function (ticker, period1='2020-01-01', interval='1mo') {
    try {
        const data = await yahooFinance.chart(ticker, { period1, interval });

        return data;
    } catch (error) {
        throw new Error(`Error fetching data for ${ticker}: ${error.message}`);
    }
};

const getNewsData = async function (ticker, newsCount=25) {
    try {
        const data = await yahooFinance.search(ticker, { newsCount });

        return data.news;
    } catch (error) {
        throw new Error(`Error fetching data for ${ticker}: ${error.message}`);
    }
};

export {
    getStockData,
    getChartData,
    getNewsData,
};