import { DefaultApi, ApiClient } from 'finnhub';
import withCache from '../services/redis.js';
import { config } from 'dotenv';

config();

// get finnhub company data
async function getCompanyDataWithoutCache(symbol, finnhubClient = new DefaultApi()) {
    try {
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
        return data;
    } catch (error) {
        // console.error('Error:', error);
        throw error;
    }
}

//keyGenerator function
const keyGenerator = (symbol) => `finnhub:getCompanyData:${symbol}`;

// Export the function with caching
const getCompanyData = withCache(keyGenerator)(getCompanyDataWithoutCache);

export {
    getCompanyData,
};