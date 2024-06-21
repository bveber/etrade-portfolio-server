const axios = require('axios');
const OAuth = require('oauth-1.0a');
const crypto = require('crypto');
const moment = require('moment-timezone');
const cache = require('./cache');
require('dotenv').config();

const consumerKey = process.env.ETRADE_CONSUMER_KEY;
const consumerSecret = process.env.ETRADE_CONSUMER_SECRET;
const baseUrl = process.env.ETRADE_BASE_URL;

const oauth = OAuth({
    consumer: { key: consumerKey, secret: consumerSecret },
    signature_method: 'HMAC-SHA1',
    hash_function(baseString, key) {
        return crypto.createHmac('sha1', key).update(baseString).digest('base64');
    },
    callback: 'oob',
});

function getEndOfDayEasternTime() {
    return moment.tz('America/New_York').endOf('day').valueOf();
}

// Function to get request token
async function getRequestToken() {
    if (cache.requestToken && Date.now() < cache.requestTokenExpiryTime) {
        console.log('Using cached request token');
        return {
            oauth_token: cache.requestToken,
            oauth_token_secret: cache.requestTokenSecret,
        };
    }
    console.log('Requesting new request token');
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

        cache.requestToken = oauth_token;
        cache.requestTokenSecret = oauth_token_secret;
        cache.requestTokenExpiryTime = Date.now() + 5 * 60 * 1000; // Cache for 5 minutes
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
    if (cache.accessToken && Date.now() < cache.accessTokenExpiryTime) {
        console.log('Using cached access token');
        return {
            oauth_token: cache.accessToken,
            oauth_token_secret: cache.accessTokenSecret,
        };
    }
    console.log('Requesting new access token');
    const requestData = {
        url: `${baseUrl}/oauth/access_token`,
        method: 'POST',
        data: { oauth_verifier: verifier },
    };

    const token = { key: requestToken, secret: requestTokenSecret };
    const headers = oauth.toHeader(oauth.authorize(requestData, token));
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    headers.oauth_verifier = verifier;

    try {
        const response = await axios.post(requestData.url, {}, { headers });
        const responseData = new URLSearchParams(response.data);
        cache.accessToken = responseData.get('oauth_token');
        cache.accessTokenSecret = responseData.get('oauth_token_secret');
        cache.accessTokenExpiryTime = getEndOfDayEasternTime();

        return { oauth_token: cache.accessToken, oauth_token_secret: cache.accessTokenSecret };
    } catch (error) {
        console.error('Error obtaining access token:', error.response ? error.response.data : error.message);
        throw error;
    }
}

module.exports = {
    getRequestToken,
    getAccessToken,
    oauth,
    consumerKey,
    baseUrl,
};
