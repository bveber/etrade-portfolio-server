const express = require('express');
const axios = require('axios');
const OAuth = require('oauth-1.0a');
const crypto = require('crypto');
const fs = require('fs');
const moment = require('moment-timezone');
require('dotenv').config();

const app = express();
const port = 3000;

// Load E-Trade API credentials from environment variables
const consumerKey = process.env.CONSUMER_KEY;
const consumerSecret = process.env.CONSUMER_SECRET;
const baseUrl = 'https://api.etrade.com';

const oauth = OAuth({
  consumer: { key: consumerKey, secret: consumerSecret },
  signature_method: 'HMAC-SHA1',
  hash_function(base_string, key) {
    return crypto.createHmac('sha1', key).update(base_string).digest('base64');
  },
  callback: 'oob'
});

let cachedRequestToken = null;
let cachedRequestTokenSecret = null;
let requestTokenExpiryTime = null;
let cachedAccessToken = null;
let cachedAccessTokenSecret = null;
let accessTokenExpiryTime = null;


// Function to calculate end of day in US Eastern Time
function getEndOfDayEasternTime() {
    return moment.tz('America/New_York').endOf('day').valueOf();
  }

// Function to get request token
async function getRequestToken() {
  if (cachedRequestToken && Date.now() < requestTokenExpiryTime) {
    console.log('Using cached request token')
    return {
      oauth_token: cachedRequestToken,
      oauth_token_secret: cachedRequestTokenSecret,
    };
  }
  console.log('Requesting new request token')
  const requestData = {
    url: `${baseUrl}/oauth/request_token`,
    method: 'POST',
    data: { oauth_callback: 'oob' },
  };

  const headers = oauth.toHeader(oauth.authorize(requestData));

  try {
    const response = await axios.post(requestData.url, {}, { headers });
    const responseData = new URLSearchParams(response.data);
    const oauth_token = responseData.get('oauth_token');
    const oauth_token_secret = responseData.get('oauth_token_secret');

    cachedRequestToken = oauth_token;
    cachedRequestTokenSecret = oauth_token_secret;
    requestTokenExpiryTime = Date.now() + 5 * 60 * 1000; // Cache for 5 minutes
    return {
      oauth_token,
      oauth_token_secret,
    };
  } catch (error) {
    console.error('Error obtaining request token:', error.response ? error.response.data : error.message);
    throw error;
  }
}

// Function to get access token
async function getAccessToken(requestToken, requestTokenSecret, verifier) {
  if (cachedAccessToken && Date.now() < accessTokenExpiryTime) {
    console.log('Using cached access token')
    return {
      oauth_token: cachedAccessToken,
      oauth_token_secret: cachedAccessTokenSecret,
    };
  }
  console.log('Requesting new access token')
  const requestData = {
    url: `${baseUrl}/oauth/access_token`,
    method: 'POST',
    data: { oauth_verifier: verifier },
  };

  const token = { key: requestToken, secret: requestTokenSecret };
  const headers = oauth.toHeader(oauth.authorize(requestData, token));
  headers['Content-Type'] = 'application/x-www-form-urlencoded';
  headers['oauth_verifier'] = verifier;

  try {
    const response = await axios.post(requestData.url, {}, { headers });
    const responseData = new URLSearchParams(response.data);
    cachedAccessToken = responseData.get('oauth_token');
    cachedAccessTokenSecret = responseData.get('oauth_token_secret');
    accessTokenExpiryTime = getEndOfDayEasternTime();

    return { oauth_token: cachedAccessToken, oauth_token_secret: cachedAccessTokenSecret };
  } catch (error) {
    console.error('Error obtaining access token:', error.response ? error.response.data : error.message);
    throw error;
  }
}

// Function for custom error handling
function handleCustomError(error) {
    if (error.response) {
        console.error('Error Response Data:', error.response.data);
        console.error('Error Response Status:', error.response.status);
        console.error('Error Response Headers:', error.response.headers);
    } else if (error.request) {
        console.error('Error Request:', error.request);
    } else {
        console.error('Error Message:', error.message);
    }
    throw new Error(`Error retrieving account list: ${error.message}`);
}

// Function to get account list
async function getAccountList() {
    if (!cachedAccessToken || !cachedAccessTokenSecret || Date.now() > accessTokenExpiryTime) {
        throw new Error('OAuth tokens are not available or expired. Please authenticate first.');
    }

    const requestData = {
        url: `${baseUrl}/v1/accounts/list`,
        method: 'GET',
    };

    const token = { key: cachedAccessToken, secret: cachedAccessTokenSecret };
    const headers = oauth.toHeader(oauth.authorize(requestData, token));

    try {
        const response = await axios.get(requestData.url, { headers });
        return response.data.AccountListResponse;
    }
    catch (error) {
        handleCustomError(error);
    }
}

// Function to get account balance
async function getAccountBalance(accountIdKey, institutionType = 'BROKERAGE') {
    const requestData = {
      url: `${baseUrl}/v1/accounts/${accountIdKey}/balance?instType=${institutionType}&realTimeNAV=true`,
      method: 'GET',
    };
  
    const token = { key: cachedAccessToken, secret: cachedAccessTokenSecret };
    const headers = oauth.toHeader(oauth.authorize(requestData, token));
  
    try {
      const response = await axios.get(requestData.url, { headers });
      return response.data;
    } catch (error) {
        handleCustomError(error);
    }
  }
  
  // Function to get account balances
  async function getAccountBalances() {
    if (!cachedAccessToken || !cachedAccessTokenSecret || Date.now() > accessTokenExpiryTime) {
      throw new Error('OAuth tokens are not available or expired. Please authenticate first.');
    }
  
    try {
      const accountList = await getAccountList();
      const accounts = accountList.Accounts.Account;
  
      if (!accounts) {
        throw new Error('No accounts found.');
      }
  
      const accountBalances = await Promise.all(
        accounts.map(async (account) => {
          const balance = await getAccountBalance(account.accountIdKey, account.institutionType);
          return {
            accountId: account.accountId,
            accountName: account.accountName,
            balance,
          };
        })
      );
  
      return accountBalances;
    } catch (error) {
        handleCustomError(error);
    }
  }

// Endpoint to request portfolio data
app.get('/accountBalances', async (req, res) => {
    try {
      const data = await getAccountBalances();
      fs.writeFileSync('data/accountBalance.json', JSON.stringify(data, null, 2));
      res.json(data);
    } catch (error) {
      res.status(500).send(error.message);
    }
});

// Endpoint to retrieve persisted portfolio data
app.get('/accountBalances/local', (req, res) => {
    if (fs.existsSync('data/accountBalances.json')) {
      const data = fs.readFileSync('data/accountBalances.json');
      res.json(JSON.parse(data));
    } else {
      res.status(404).send('No local portfolio data found');
    }
});

// Function to get portfolio data for an account
async function getAccountPortfolio(accountIdKey) {
    const requestData = {
      url: `${baseUrl}/v1/accounts/${accountIdKey}/portfolio`,
      method: 'GET',
    };
  
    const token = { key: cachedAccessToken, secret: cachedAccessTokenSecret };
    const headers = oauth.toHeader(oauth.authorize(requestData, token));
  
    try {
      const response = await axios.get(requestData.url, { headers });
      return response.data;
    } catch (error) {
      console.error(`Error retrieving portfolio for account ${accountIdKey}:`, error.response ? error.response.data : error.message);
      throw error;
    }
}
  
  // Function to get portfolio data (all accounts)
  async function getPortfolioData() {
    if (!cachedAccessToken || !cachedAccessTokenSecret || Date.now() > accessTokenExpiryTime) {
      throw new Error('OAuth tokens are not available or expired. Please authenticate first.');
    }
  
    try {
      const accountList = await getAccountList();
      const accounts = accountList.Accounts.Account;
  
      if (!accounts) {
        throw new Error('No accounts found.');
      }
  
      const accountPortfolios = await Promise.all(
        accounts.map(async (account) => {
          const portfolio = await getAccountPortfolio(account.accountIdKey);
          return {
            accountId: account.accountIdKey,
            accountName: account.accountName,
            portfolio,
          };
        })
      );
  
      return accountPortfolios;
    } catch (error) {
      console.error('Error retrieving portfolio data:', error.message);
      throw error;
    }
}
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

// Function to get transactions for an account
async function getAccountTransactions(accountIdKey) {
    const requestData = {
      url: `${baseUrl}/v1/accounts/${accountIdKey}/transactions`,
      method: 'GET',
    };
  
    const token = { key: cachedAccessToken, secret: cachedAccessTokenSecret };
    const headers = oauth.toHeader(oauth.authorize(requestData, token));
  
    try {
      const response = await axios.get(requestData.url, { headers });
      return response.data;
    } catch (error) {
      console.error(`Error retrieving transactions for account ${accountIdKey}:`, error.response ? error.response.data : error.message);
      throw error;
    }
}

// Endpoint to start the authorization process
app.get('/authorize', async (req, res) => {
  try {
    const { oauth_token } = await getRequestToken();
    const authorizeUrl = `https://us.etrade.com/e/t/etws/authorize?key=${consumerKey}&token=${oauth_token}`;
    res.send(`Please authorize your application by visiting this URL: <a href="${authorizeUrl}">${authorizeUrl}</a>`);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Endpoint to handle the verifier and get the access token
app.get('/callback', async (req, res) => {
    if (!cachedRequestToken || !cachedRequestTokenSecret || Date.now() > requestTokenExpiryTime) {
        await getRequestToken();
    }
    const oauth_verifier = req.query['oauth_verifer'];

    try {
        await getAccessToken(cachedRequestToken, cachedRequestTokenSecret, oauth_verifier);

        res.send(`Access Token obtained successfully. You can now use the API.`);
    } catch (error) {
    res.status(500).send(error.message);
    }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
