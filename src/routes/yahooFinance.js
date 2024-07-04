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

export {
    getStockData,
};