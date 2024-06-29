import { quoteSummary } from 'yahoo-finance2';
import RedisClientHander from '../services/redis.js';

// Get data for a stock
async function getStockData(symbol, redisClient = new RedisClientHander()) {
    try {
        // Check if data is in Redis
        const cacheToken = `yahooFinance:getStockData:${symbol}`;
        const cachedData = await redisClient.get(cacheToken);

        if (cachedData) {
            return cachedData;
        }

        const queryOptions = { modules: ['assetProfile', 'summaryDetail', 'defaultKeyStatistics', 'financialData']  }; // defaults
        console.log(quoteSummary);
        const data = await quoteSummary(symbol, queryOptions);

        // Store data in Redis
        await redisClient.set(cacheToken, data, 3600);

        return data;
    } catch (error) {
        throw new Error(`Error fetching data for ${symbol}: ${error.message}`);
    }
}

export {
    getStockData,
};