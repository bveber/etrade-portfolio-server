const express = require('express');
const path = require('path');
const fs = require('fs');
const { getRequestToken, getAccessToken, consumerKey } = require('./services/oauth');
const { getPortfolioData } = require('./routes/portfolio');
const { getTransactionsData } = require('./routes/transactions');
const { getAccountBalances } = require('./routes/accountBalances');
const { get10k } = require('./routes/edgar');
const cache = require('./services/cache');

const app = express();
const port = 3000;

// Serve the static HTML file
app.use(express.static(path.join(__dirname, '..', 'public')));

// Endpoint to start the authorization process
app.get('/authorize', async (req, res) => {
    try {
        const { oauth_token } = await getRequestToken();
        const authorizeUrl = `https://us.etrade.com/e/t/etws/authorize?key=${consumerKey}&token=${oauth_token}`;
        res.send(`<a href="${authorizeUrl}" target="_blank">Please authorize your application by clicking here</a>`);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// Endpoint to handle the verifier and get the access token
app.get('/callback', async (req, res) => {
    try {
        if (!cache.requestToken || !cache.requestTokenSecret || Date.now() > cache.requestTokenExpiryTime) {
            await getRequestToken();
        }
        const oauth_verifier = req.query.oauth_verifier;
        await getAccessToken(cache.requestToken, cache.requestTokenSecret, oauth_verifier);
        res.send('Access Token obtained successfully. You can now use the API.');
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// Endpoint to request account balances data
app.get('/accountBalances', async (req, res) => {
    try {
        const data = await getAccountBalances();
        fs.writeFileSync('data/accountBalances.json', JSON.stringify(data, null, 2));
        res.json(data);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// Endpoint to retrieve persisted account balances data
app.get('/accountBalances/local', (req, res) => {
    if (fs.existsSync('data/accountBalances.json')) {
        const data = fs.readFileSync('data/accountBalances.json');
        res.json(JSON.parse(data));
    } else {
        res.status(404).send('No local account balances data found');
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

// Endpoint to retrieve persisted portfolio data
app.get('/portfolio/local', (req, res) => {
    if (fs.existsSync('data/portfolio.json')) {
        const data = fs.readFileSync('data/portfolio.json');
        res.json(JSON.parse(data));
    } else {
        res.status(404).send('No local portfolio data found');
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

// Endpoint to retrieve persisted transactions data
app.get('/transactions/local', (req, res) => {
    if (fs.existsSync('data/transactions.json')) {
        const data = fs.readFileSync('data/transactions.json');
        res.json(JSON.parse(data));
    } else {
        res.status(404).send('No local transactions data found');
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

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});
