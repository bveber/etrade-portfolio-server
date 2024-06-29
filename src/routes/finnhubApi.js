import { DefaultApi, ApiClient } from 'finnhub';
import RedisClientHandler from '../services/redis.js';
import { config } from 'dotenv';

config();

// get finnhub company data
async function getCompanyData(symbol, redisClient = new RedisClientHandler(), finnhubClient = new DefaultApi()) {
    try {
        // Check if data is in Redis
        const cacheToken = `finnhub:getCompanyData:${symbol}`;
        const cachedData = await redisClient.get(cacheToken);

        if (cachedData) {
            return cachedData;
        }

        const api_key = ApiClient.instance.authentications['api_key'];
        api_key.apiKey = process.env.FINNHUB_API_KEY;
        const data = await new Promise((resolve, reject) => {
            finnhubClient.companyProfile2({ symbol: symbol }, (error, data, ) => {
                if (error) {
                    console.error('Error calling Finnhub API:', error);
                    reject(error);
                } else {
                    resolve(data);
                }
            });
        });

        // Store data in Redis
        await redisClient.set(cacheToken, data, 3600);

        return data;
    } catch (error) {
        // console.error('Error:', error);
        throw error;
    }
}

export {
    getCompanyData,
};