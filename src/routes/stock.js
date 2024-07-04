import { getCompanyData } from './finnhubApi.js';
import { getStockData } from './yahooFinance.js';
import { get10k } from './edgar.js';
import * as utils from '../services/utils.js';

export async function getStock(req, res, redisClient) {
    const { ticker } = req.query;
    try {
        const yahooFinanceData = await getStockData(ticker, utils.yahooFinanceKeyGenerator, utils.yahooFinanceTtl, redisClient);
        const finnhubData = await getCompanyData(ticker, utils.finnhubApiKeyGenerator, utils.finnhubApiTtl, redisClient);
        const filings = await get10k(ticker, utils.edgarKeyGenerator, utils.edgarTtl, redisClient);
        const returnData = {
            yahooFinance: yahooFinanceData,
            finnhub: finnhubData,
            filings: filings,
        };
        res.json(returnData);
        return returnData;
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}
