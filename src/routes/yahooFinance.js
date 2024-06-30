import yahooFinance from 'yahoo-finance2';
import withCache from '../services/redis.js';

// Get data for a stock
const getStockDataWithoutCache = async function (symbol) {
    try {
        const queryOptions = { modules: ['assetProfile', 'summaryDetail', 'defaultKeyStatistics', 'financialData']  }; // defaults
        const data = await yahooFinance.quoteSummary(symbol, queryOptions);

        return data;
    } catch (error) {
        throw new Error(`Error fetching data for ${symbol}: ${error.message}`);
    }
};

//keyGenerator function
const keyGenerator = (symbol) => `yahooFinance:getStockData:${symbol}`;

// Export the function with caching
const getStockData = withCache(keyGenerator)(getStockDataWithoutCache);

export {
    getStockData,
};