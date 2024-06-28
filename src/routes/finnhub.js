import finnhub from 'finnhub';
import RedisCache from '../services/redis.js';
import { config } from 'dotenv';

config();
const redisClient = new RedisCache();

// get finnhub company data
async function getCompanyData(symbol) {
    try {
        // Check if data is in Redis
        const cacheToken = `finnhub:getCompanyData:${symbol}`;
        const cachedData = await redisClient.get(cacheToken);

        if (cachedData) {
            return cachedData;
        }

        const api_key = finnhub.ApiClient.instance.authentications['api_key'];
        api_key.apiKey = process.env.FINNHUB_API_KEY;
        const finnhubClient = new finnhub.DefaultApi();

        const data = await new Promise((resolve, reject) => {
            finnhubClient.companyProfile2({symbol: symbol}, (error, data, response) => {
                if (error) {
                    console.error("Error calling Finnhub API:", error);
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
        console.error('Error:', error);
        throw error;
    }
}

export {
    getCompanyData,
};