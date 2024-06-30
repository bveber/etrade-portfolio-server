import axios from 'axios';
import OAuth from 'oauth-1.0a';
import crypto from 'crypto';
import withCache, { RedisClientHandler } from './redis.js';
import { config } from 'dotenv';

config();

const encryptionKey = Buffer.from(process.env.ENCRYPTION_KEY, 'hex'); // Must be 32 bytes for AES-256
const consumerKey = process.env.ETRADE_CONSUMER_KEY;
const consumerSecret = process.env.ETRADE_CONSUMER_SECRET;
const baseUrl = 'https://api.etrade.com';

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
async function getRequestTokenWithoutCache() {
    console.log('Requesting new request token');
    const requestData = {
        url: `${baseUrl}/oauth/request_token`,
        method: 'POST',
        data: { oauth_callback: 'oob' },
    };

    const headers = oauth.toHeader(oauth.authorize(requestData));
    const response = await axios.post(requestData.url, {}, { headers });
    const responseData = new URLSearchParams(response.data);
    if (!responseData.has('oauth_token') || !responseData.has('oauth_token_secret')) {
        throw new Error('Request token response not properly formatted');
    }

    try {
        const oauth_token = responseData.get('oauth_token');
        const oauth_token_secret = responseData.get('oauth_token_secret');
        const data = {
            oauth_token,
            oauth_token_secret,
        };
        return data;
    } catch (error) {
        // console.error('Error obtaining request token:', error.response ? error.response.data : error.message);
        throw new Error('Failed to get request token', error);
    }
}

// keyGenerator function
const requestTokenKeyGenerator = () => 'oauth:getRequestToken';

// Export the function with caching
const getRequestToken = withCache(requestTokenKeyGenerator, 250)(getRequestTokenWithoutCache);

// Function to get access token
async function getAccessTokenWithoutCache(verifier) {
    // const cacheToken = 'oauth:getAccessToken';
    // const cachedData = await redisClient.get(cacheToken);
    // if (cachedData) {
    //     const oauth_token = cachedData.oauth_token;
    //     const oauth_token_secret = decrypt(cachedData.encrypted_oauth_token_secret);
    //     return { oauth_token, oauth_token_secret };
    // }
    const requestTokenData = await getRequestToken();
    if (!verifier) {
        throw new Error('Verifier is missing');
    }
    console.log('Requesting new access token');
    const requestData = {
        url: `${baseUrl}/oauth/access_token`,
        method: 'POST',
        data: { oauth_verifier: verifier },
    };
    const token = { key: requestTokenData.oauth_token, secret: requestTokenData.oauth_token_secret };
    const headers = oauth.toHeader(oauth.authorize(requestData, token));
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    headers.oauth_verifier = verifier;

    const response = await axios.post(requestData.url, {}, { headers });
    const responseData = new URLSearchParams(response.data);
    if (!responseData.has('oauth_token') || !responseData.has('oauth_token_secret')) {
        throw new Error('Failed to get access token');
    }

    try {
        const accessToken = responseData.get('oauth_token');
        const encryptedAccessTokenSecret = encrypt(responseData.get('oauth_token_secret'));

        const data = {
            'oauth_token': accessToken,
            'encrypted_oauth_token_secret': encryptedAccessTokenSecret,
        };

        // redisClient.set(cacheToken, data, 86400);
        return data;
    } catch (error) {
        console.error('Error obtaining access token:', error.response ? error.response.data : error.message);
        throw error;
    }
}

// keyGenerator function
const accessTokenKey = 'oauth:getAccessToken';
const accessTokenKeyGenerator = () => accessTokenKey;

// Export the function with caching
const getAccessToken = withCache(accessTokenKeyGenerator)(getAccessTokenWithoutCache);

async function getDecryptedAccessToken(redisClient = new RedisClientHandler()) {
    const cacheToken = accessTokenKey;
    const cachedData = await redisClient.get(cacheToken);
    if (!cachedData) {
        throw new Error('OAuth tokens are not available or expired. Please authenticate first.');
    }
    const token = { key: cachedData.oauth_token, secret: decrypt(cachedData.encrypted_oauth_token_secret) };
    return token;
}

export {
    getRequestToken,
    getAccessToken,
    oauth,
    consumerKey,
    baseUrl,
    encrypt,
    decrypt,
    getDecryptedAccessToken,
};
