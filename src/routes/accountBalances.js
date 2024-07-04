import axios from 'axios';
import { oauth } from '../services/oauth.js';
import withCache from '../services/redis.js';
import { etradeBaseUrl } from '../services/utils.js';

// Function to get account balance
async function getAccountBalance(accountIdKey, institutionType = 'BROKERAGE', token) {
    const requestData = {
        url: `${etradeBaseUrl}/v1/accounts/${accountIdKey}/balance?instType=${institutionType}&realTimeNAV=true`,
        method: 'GET',
    };
    const headers = oauth.toHeader(oauth.authorize(requestData, token));

    try {
        const response = await axios.get(requestData.url, { headers });
        return response.data;
    } catch (error) {
        throw new Error('Error fetching account balance.', error);
    }
}

// Function to get account balances
async function getAccountBalancesWithoutCache(accountList, token) {
    if (!accountList) {
        throw new Error('No accounts found.');
    }
    try {
        const accountBalances = await Promise.all(
            accountList.map(async (account) => {
                const balance = await getAccountBalance(account.accountIdKey, account.institutionType, token);
                return {
                    accountId: account.accountId,
                    accountName: account.accountName,
                    balance,
                };
            })
        );

        return accountBalances;
    } catch (error) {
        throw new Error('Error fetching account balances.', error);
    }
}

// Export the function with caching
const getAccountBalances = (accountList, token, keyGenerator, ttl, redisClient) => withCache(keyGenerator, ttl, redisClient)(getAccountBalancesWithoutCache)(accountList, token);

export {
    getAccountBalances,
};
