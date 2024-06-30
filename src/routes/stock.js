import { getCompanyData } from './finnhubApi.js';
import { getStockData } from './yahooFinance.js';
import { get10k } from './edgar.js';

export async function getStock(req, res) {
    const { ticker } = req.query;
    try {
        const yahooFinanceData = await getStockData(ticker);
        const finnhubData = await getCompanyData(ticker);
        const filings = await get10k(ticker);
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
