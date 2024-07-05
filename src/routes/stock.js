import { getCompanyData } from './finnhubApi.js';
import { getStockData } from './yahooFinance.js';
import { get10k } from './edgar.js';
import * as utils from '../services/utils.js';

export async function getStock(ticker, redisClient) {
    let yahooFinanceData;
    try {
        yahooFinanceData = await getStockData(ticker, utils.yahooFinanceKeyGenerator, utils.yahooFinanceTtl, redisClient);
    } catch (error) {
        console.error('Error fetching Yahoo Finance data for ticker: ',ticker, error);
        yahooFinanceData = null;
    }

    let finnhubData;
    try {
        finnhubData = await getCompanyData(ticker, utils.finnhubApiKeyGenerator, utils.finnhubApiTtl, redisClient);
    } catch (error) {
        console.error('Error fetching Finnhub data for ticker: ', ticker, error);
        finnhubData = null;
    }

    let filings;
    try {
        filings = await get10k(ticker, utils.edgarKeyGenerator, utils.edgarTtl, redisClient);
    } catch (error) {
        console.error('Error fetching 10-K data for ticker: ', ticker, error);
        filings = null;
    }

    const returnData = {
        yahooFinance: yahooFinanceData,
        finnhub: finnhubData,
        filings: filings,
    };
    return returnData;
}
