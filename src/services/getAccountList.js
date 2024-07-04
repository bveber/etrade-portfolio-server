import axios from 'axios';
import { oauth } from './oauth.js';
import withCache from './redis.js';
import { etradeBaseUrl } from './utils.js';

async function getAccountListWithoutCache(token) {

    const requestData = {
        url: `${etradeBaseUrl}/v1/accounts/list`,
        method: 'GET',
    };

    const headers = oauth.toHeader(oauth.authorize(requestData, token));
    try {
        const response = await axios.get(requestData.url, { headers });
        return response.data.AccountListResponse.Accounts.Account;
    } catch (error) {
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
