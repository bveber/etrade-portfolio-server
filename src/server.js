import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
    getRequestToken,
    getAccessToken,
    consumerKey,
} from './services/oauth.js';
import { getPortfolioData, flattenPortfolioData } from './routes/portfolio.js';
import { getTransactionsData } from './routes/transactions.js';
import { getAccountBalances } from './routes/accountBalances.js';
import { get10k } from './routes/edgar.js';
import { getStockData } from './routes/yahooFinance.js';
import { getCompanyData } from './routes/finnhubApi.js';
import { getStock } from './routes/stock.js';
import { RedisClientHandler } from './services/redis.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

// Serve the static HTML file
app.use(express.static(path.join(__dirname, '..', 'public')));

// Endpoint to start the authorization process
app.get('/authorize', async (req, res) => {
    try {
        // TODO: Move these generator and TTL values to a config file
        // keyGenerator function
        const requestTokenKeyGenerator = () => 'oauth:getRequestToken';

        // Request token ttl
        const requestTokenTtl = 250;
        const redisClient = new RedisClientHandler();
        const cachedRequestToken = getRequestToken(requestTokenKeyGenerator, requestTokenTtl, redisClient);
        const requestTokenData = await cachedRequestToken();
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
        const accessTokenKeyGenerator = () => 'oauth:getAccessToken';
        const accessTokenTtl = 86400;
        const redisClient = new RedisClientHandler();
        await getAccessToken(oauth_verifier, accessTokenKeyGenerator, accessTokenTtl, redisClient);
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
        const data = await getAccountBalances();
        fs.writeFileSync('data/accountBalances.json', JSON.stringify(data, null, 2));
        res.json(data);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// Endpoint to request portfolio data
app.get('/portfolio', async (req, res) => {
    try {
        const data = await getPortfolioData();
        fs.writeFileSync('data/portfolio.json', JSON.stringify(data, null, 2));
        res.json(data);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// Serve the portfolio.html page
app.get('/portfolioPage', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'portfolio.html'));
});

// Endpoint to request portfolio data
app.get('/portfolioFlattened', async (req, res) => {
    try {
        const portfolio = await getPortfolioData();
        // const portfolio = JSON.parse(fs.readFileSync('data/portfolio.json'));
        const data = await flattenPortfolioData(portfolio);
        fs.writeFileSync('data/portfolioFlattened.json', JSON.stringify(data, null, 2));
        res.json(data);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// Endpoint to request transactions data
app.get('/transactions', async (req, res) => {
    try {
        const data = await getTransactionsData();
        fs.writeFileSync('data/transactions.json', JSON.stringify(data, null, 2));
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
        const filings = await get10k(ticker);
        res.json(filings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Endpoint to retrieve yahoo finance data
app.get('/yahooFinance', async (req, res) => {
    const { ticker } = req.query;
    try {
        const data = await getStockData(ticker);
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Endpoint to retrieve Finnhub data
app.get('/finnhub', async (req, res) => {
    const { ticker } = req.query;
    try {
        const data = await getCompanyData(ticker);
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Endpoint to retrieve stock data
app.get('/stock', async (req, res) => {
    try {
        await getStock(req, res);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});
