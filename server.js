const express = require('express');
const axios = require('axios');
const OAuth = require('oauth-1.0a');
const crypto = require('crypto');
const fs = require('fs');
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
  callback: 'oob'  // Add this line to specify the out-of-band callback
});

// Cache variables
let cachedToken = null;
let cachedTokenSecret = null;
let cacheExpiryTime = null;

// Function to get request token
async function getRequestToken() {
    const requestData = {
      url: `${baseUrl}/oauth/request_token`,
      method: 'POST',
      data: { oauth_callback: 'oob' }
    };
  
    const headers = oauth.toHeader(oauth.authorize(requestData));
  
    console.log('Request Data:', requestData);
    console.log('OAuth Headers:', headers);
  
    try {
      const response = await axios.post(requestData.url, {}, { headers });
      const responseData = new URLSearchParams(response.data);
  
      const oauth_token = responseData.get('oauth_token');
      const oauth_secret = responseData.get('oauth_token_secret');
    //   cacheExpiryTime = Date.now() + 1 * 60 * 1000; // Cache for 1 minute
  
      console.log('Request Token:', oauth_token);
      console.log('Request Token Secret:', oauth_secret);
  
      // Invalidate the cache after 1 minute
    //   setTimeout(() => {
    //     cachedToken = null;
    //     cachedTokenSecret = null;
    //     cacheExpiryTime = null;
    //   }, 1 * 60 * 1000);
  
      return {
        oauth_token: oauth_token,
        oauth_token_secret: oauth_secret
      };
    } catch (error) {
      console.error('Error obtaining request token:', error.response ? error.response.data : error.message);
      throw error;
    }
  }

// Function to get portfolio data
async function getPortfolioData() {
  if (!cachedToken || !cachedTokenSecret || Date.now() > cacheExpiryTime) {
      await getRequestToken();
  }

  const requestData = {
    url: `${baseUrl}/v1/accounts/list`,
    method: 'GET'
  };

  const token = {
    key: cachedToken,
    secret: cachedTokenSecret
  };

//   const headers = oauth.toHeader(oauth.authorize(requestData, token));

  console.log('Request Data:', requestData);
  console.log('OAuth Headers:', headers);

  try {
    const response = await axios.get(requestData.url, { headers });
    console.log('Portfolio Data Response:', response.data);
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error('Error Response Data:', error.response.data);
      console.error('Error Response Status:', error.response.status);
      console.error('Error Response Headers:', error.response.headers);
    } else if (error.request) {
      console.error('Error Request:', error.request);
    } else {
      console.error('Error Message:', error.message);
    }
    throw new Error(`Error retrieving portfolio data: ${error.message}`);
  }
}

// Endpoint to request portfolio data
app.get('/portfolio', async (req, res) => {
  try {
    const data = await getPortfolioData();
    fs.writeFileSync('portfolio.json', JSON.stringify(data, null, 2));
    res.json(data);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Endpoint to retrieve persisted portfolio data
app.get('/portfolio/local', (req, res) => {
  if (fs.existsSync('portfolio.json')) {
    const data = fs.readFileSync('portfolio.json');
    res.json(JSON.parse(data));
  } else {
    res.status(404).send('No local portfolio data found');
  }
});

// Endpoint to authorize the app
app.get('/authorize', async (req, res) => {
    try {
      const { oauth_token, oauth_token_secret } = await getRequestToken();
      const authorizeUrl = `https://us.etrade.com/e/t/etws/authorize?key=${oauth_token}&token=${oauth_token_secret}`;
      res.send(`Please authorize your application by visiting this URL: <a href="${authorizeUrl}">${authorizeUrl}</a>`);
    } catch (error) {
      res.status(500).send(error.message);
    }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
