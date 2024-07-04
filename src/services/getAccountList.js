import axios from 'axios';
import { oauth } from './oauth.js';
import withCache from './redis.js';
import { etradeBaseUrl } from './utils.js';

async function getAccountListWithoutCache(token) {
    console.log('getAccountListWithoutCache token:', token);
    const requestData = {
        url: `${etradeBaseUrl}/v1/accounts/list`,
        method: 'GET',
    };

    const headers = oauth.toHeader(oauth.authorize(requestData, token));
    console.log('getAccountListWithoutCache headers:', headers);
    try {
        const response = await axios.get(requestData.url, { headers });
        console.log('getAccountListWithoutCache response:', response.data);
        return response.data.AccountListResponse.Accounts.Account;
    } catch (error) {
        // throw error;
        throw new Error('Error fetching account list.', error);
    }
}

const getAccountList = (
    token,
    keyGenerator,
    ttl,
    redisClient
) => withCache(keyGenerator, ttl, redisClient)(getAccountListWithoutCache)(token);

export {
    getAccountList,
};
