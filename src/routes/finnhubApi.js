import { DefaultApi, ApiClient } from 'finnhub';
import withCache from '../services/redis.js';
import { config } from 'dotenv';

config();

// get finnhub company data
async function getCompanyDataWithoutCache(ticker, finnhubClient = new DefaultApi()) {
    try {
        const api_key = ApiClient.instance.authentications['api_key'];
        api_key.apiKey = process.env.FINNHUB_API_KEY;
        const data = await new Promise((resolve, reject) => {
            finnhubClient.companyProfile2({ symbol: ticker }, (error, data, ) => {
                if (error) {
                    console.error('Error calling Finnhub API:', error);
                    reject(error);
                } else {
                    resolve(data);
                }
            });
        });
        return data;
    } catch (error) {
        throw error;
    }
}

// Export the function with caching
const getCompanyData = (
    ticker,
    keyGenerator,
    ttl,
    redisClient
) => withCache(keyGenerator, ttl, redisClient)(getCompanyDataWithoutCache)(ticker);

export {
    getCompanyData,
};