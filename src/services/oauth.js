import axios from 'axios';
import OAuth from 'oauth-1.0a';
import crypto from 'crypto';
import RedisCache from './redis.js';
import { config } from 'dotenv';

config();

const encryptionKey = Buffer.from(process.env.ENCRYPTION_KEY, 'hex'); // Must be 32 bytes for AES-256
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

// Encryption key for encrypting sensitive data
function encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', encryptionKey, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

// Decryption key for decrypting sensitive data
function decrypt(text) {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', encryptionKey, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

// Function to get request token
async function getRequestToken() {
    const redisClient = new RedisCache(300);
    const cacheToken = `oauth:getRequestToken`;
    const cachedData = await redisClient.get(cacheToken);
    console.log('Cached data:', cachedData);
    if (cachedData) {
        return cachedData;
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
        if (!responseData.has('oauth_token') || !responseData.has('oauth_token_secret')) {
            throw new Error('Failed to get request token');
        }
        const oauth_token = responseData.get('oauth_token');
        const oauth_token_secret = responseData.get('oauth_token_secret');
        const data = {
            oauth_token,
            oauth_token_secret,
        };
        redisClient.set(cacheToken, JSON.stringify(data));
        return data;
    } catch (error) {
        console.error('Error obtaining request token:', error.response ? error.response.data : error.message);
        throw error;
    }
}

// Function to get access token
async function getAccessToken(verifier) {
    const redisClient = new RedisCache();
    const cacheToken = `oauth:getAccessToken`;
    const cachedData = await redisClient.get(cacheToken);
    console.log('getAccessToken Cached data:', cachedData);
    if (cachedData) {
        const oauth_token = cachedData.oauth_token;
        const oauth_token_secret = decrypt(cachedData.encrypted_oauth_token_secret);
        return { oauth_token, oauth_token_secret }
    }
    const token = await getAccessTokenCache();
    console.log('getAccessToken Request token data:', requestTokenData);
    // const requestToken = requestTokenData.oauth_token;
    // if (!requestToken) {
    //     throw new Error('Request token is missing');
    // }   
    // const requestTokenSecret = requestTokenData.oauth_token_secret;
    // if (!requestTokenSecret) {
    //     throw new Error('Request token secret is missing');
    // }
    if (!verifier) {
        throw new Error('Verifier is missing');
    }
    console.log('Requesting new access token');
    const requestData = {
        url: `${baseUrl}/oauth/access_token`,
        method: 'POST',
        data: { oauth_verifier: verifier },
    };
    console.log('Request data:', requestData);
    // const token = { key: requestToken, secret: requestTokenSecret };
    console.log('Token:', token);
    const headers = oauth.toHeader(oauth.authorize(requestData, token));
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    headers.oauth_verifier = verifier;
    console.log('Headers:', headers);

    try {
        const response = await axios.post(requestData.url, {}, { headers });
        const responseData = new URLSearchParams(response.data);
        if (!responseData.has('oauth_token') || !responseData.has('oauth_token_secret')) {
            throw new Error('Failed to get access token');
        }
        const accessToken = responseData.get('oauth_token');
        const encryptedAccessTokenSecret = encrypt(responseData.get('oauth_token_secret'));
        console.log('Access token:', accessToken);
        console.log('Encrypted access token secret:', encryptedAccessTokenSecret);
        // cache.accessTokenExpiryTime = getEndOfDayEasternTime();

        const data = {
            'oauth_token': accessToken,
            'encrypted_oauth_token_secret': encryptedAccessTokenSecret,
        };

        redisClient.set(cacheToken, JSON.stringify(data));
        return data;
    } catch (error) {
        console.error('Error obtaining access token:', error.response ? error.response.data : error.message);
        throw error;
    }
}

async function getAccessTokenCache() {
    const redisClient = new RedisCache();
    const cacheToken = `oauth:getAccessToken`;
    const cachedData = await redisClient.get(cacheToken);
    const token = { key: cachedData.oauth_token, secret: decrypt(cachedData.encrypted_oauth_token_secret) };
    if (!cachedData) {
        throw new Error('OAuth tokens are not available or expired. Please authenticate first.');
    }
    return token;
}


export {
  getRequestToken,
  getAccessToken,
  oauth,
  consumerKey,
  baseUrl,
  decrypt,
  getAccessTokenCache
};
