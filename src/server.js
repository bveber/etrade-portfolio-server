import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import {
    getRequestToken,
    getAccessToken,
    consumerKey,
} from './services/oauth.js';
import { getPortfolioData, flattenPortfolioData, enrichPortfolioData } from './routes/portfolio.js';
import { getTransactionsData } from './routes/transactions.js';
import { getAccountBalances } from './routes/accountBalances.js';
import { get10k } from './routes/edgar.js';
import { getStockData, getChartData, getNewsData } from './routes/yahooFinance.js';
import { getCompanyData } from './routes/finnhubApi.js';
import { getStock } from './routes/stock.js';
import { RedisClientHandler } from './services/redis.js';
import * as utils from './services/utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

// Serve the static HTML file
app.use(express.static(path.join(__dirname, '..', 'public')));

// Endpoint to start the authorization process
app.get('/authorize', async (req, res) => {
    try {
        const redisClient = new RedisClientHandler();
        const requestTokenData = await getRequestToken(utils.requestTokenKeyGenerator, utils.requestTokenTtl, redisClient);
        // const requestTokenData = await cachedRequestToken();
        const authorizeUrl = `https://us.etrade.com/e/t/etws/authorize?key=${consumerKey}&token=${requestTokenData.oauth_token}`;
        res.send(`<a href="${authorizeUrl}" target="_blank">Please authorize your application by clicking here</a>`);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// Endpoint to handle the verifier and get the access token
app.get('/callback', async (req, res) => {
    try {
        const oauth_verifier = req.query.oauth_verifier;
        const redisClient = new RedisClientHandler();
        const requestTokenData = await getRequestToken(utils.requestTokenKeyGenerator, utils.requestTokenTtl, new RedisClientHandler());
        await getAccessToken(oauth_verifier, requestTokenData, utils.accessTokenKeyGenerator, utils.accessTokenTtl, redisClient);
        res.send('Access Token obtained successfully. You can now use the API.');
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// Serve the accountBalances.html page
app.get('/accountBalancesPage', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'accountBalances.html'));
});

// Endpoint to request account balances
app.get('/accountBalances', async (req, res) => {
    try {
        const redisClient = new RedisClientHandler();
        const { token, accountList } = await utils.getTokenAndAccountList(redisClient);
        const data = await getAccountBalances(accountList, token, utils.getAccountBalancesKeyGenerator, utils.getAccountBalancesTtl, redisClient);
        res.json(data);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// Endpoint to request portfolio data
app.get('/portfolio', async (req, res) => {
    try {
        const redisClient = new RedisClientHandler();
        const { token, accountList } = await utils.getTokenAndAccountList(redisClient);
        const data = await getPortfolioData(accountList, token, utils.getPortfolioDataKeyGenerator, utils.getPortfolioDataTtl, redisClient);
        res.json(data);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// Serve the portfolio.html page
app.get('/portfolioPage', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'portfolio.html'));
});

// Serve the portfolioList.html page
app.get('/portfolioList', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'portfolioList.html'));
});

// Endpoint to request portfolio data
app.get('/portfolioFlattened', async (req, res) => {
    try {
        const redisClient = new RedisClientHandler();
        const { token, accountList } = utils.getTokenAndAccountList(redisClient);
        const portfolio = await getPortfolioData(accountList, token, utils.getPortfolioDataKeyGenerator, utils.getPortfolioDataTtl, redisClient);
        const data = await flattenPortfolioData(portfolio);
        res.json(data);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// Endpoint to get enriched portfolio data
app.get('/enrichedPortfolio', async (req, res) => {
    try {
        const redisClient = new RedisClientHandler();
        const { token, accountList } = await utils.getTokenAndAccountList(redisClient);
        const portfolio = await getPortfolioData(accountList, token, utils.getPortfolioDataKeyGenerator, utils.getPortfolioDataTtl, redisClient);
        const flattenedPortfolioData = await flattenPortfolioData(portfolio);
        const enrichedData = await enrichPortfolioData(flattenedPortfolioData, redisClient);
        res.json(enrichedData);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// Endpoint to request transactions data
app.get('/transactions', async (req, res) => {
    try {
        const redisClient = new RedisClientHandler();
        const { token, accountList } = await utils.getTokenAndAccountList(redisClient);
        const data = await getTransactionsData(accountList, token, utils.transactionsKeyGenerator, utils.transactionsTtl, redisClient);
        res.json(data);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// Serve the filings HTML page
app.get('/filings', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'filings.html'));
});

// Endpoint to get 10-K filing data
app.get('/get10k', async (req, res) => {
    const { ticker } = req.query;
    try {
        const redisClient = new RedisClientHandler();
        const filings = await get10k(ticker, utils.edgarKeyGenerator, utils.edgarTtl, redisClient);
        res.json(filings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Endpoint to retrieve yahoo finance data
app.get('/yahooFinance', async (req, res) => {
    const { ticker } = req.query;
    const redisClient = new RedisClientHandler();
    try {
        const data = await getStockData(ticker, utils.yahooFinanceKeyGenerator, utils.yahooFinanceTtl, redisClient);
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Endpoint to retrieve chart data
app.get('/chart', async (req, res) => {
    const { ticker, period1, interval } = req.query;
    try {
        const data = await getChartData(ticker, period1, interval);
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Endpoint to retrieve news data
app.get('/news', async (req, res) => {
    const { ticker, newsCount } = req.query;
    try {
        const data = await getNewsData(ticker, newsCount);
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Endpoint to retrieve Finnhub data
app.get('/finnhub', async (req, res) => {
    const { ticker } = req.query;
    const redisClient = new RedisClientHandler();
    try {
        const data = await getCompanyData(ticker, utils.finnhubApiKeyGenerator, utils.finnhubApiTtl, redisClient);
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Endpoint to retrieve stock data
app.get('/stock', async (req, res) => {
    try {
        const redisClient = new RedisClientHandler();
        const { ticker } = req.query;
        const data = await getStock(ticker, redisClient);
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.get('/stockPage', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'stock.html'));
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});
