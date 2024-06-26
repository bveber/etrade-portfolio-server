import axios from 'axios';
import { oauth, baseUrl, decrypt, getAccessTokenCache } from './oauth.js';
import cache from './cache.js';
import handleCustomError from './errorHandler.js';
import RedisCache from '../services/redis.js';

const redisClient = new RedisCache();

async function getAccountList() {
    const token = await getAccessTokenCache();

    const requestData = {
        url: `${baseUrl}/v1/accounts/list`,
        method: 'GET',
    };

    const headers = oauth.toHeader(oauth.authorize(requestData, token));

    try {
        const response = await axios.get(requestData.url, { headers });
        return response.data.AccountListResponse.Accounts.Account;
    } catch (error) {
        handleCustomError(error);
    }
}

export {
    getAccountList,
};
