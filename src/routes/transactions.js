import axios from 'axios';
import { getAccountList } from '../services/getAccountList.js';
import { oauth, baseUrl } from '../services/oauth.js';
import cache from '../services/cache.js';
import handleCustomError from '../services/errorHandler.js';

async function getAccountTransactions(accountIdKey) {
    const requestData = {
        url: `${baseUrl}/v1/accounts/${accountIdKey}/transactions?count=50`,
        method: 'GET',
    };

    const token = { key: cache.accessToken, secret: cache.accessTokenSecret };
    const headers = oauth.toHeader(oauth.authorize(requestData, token));

    try {
        const response = await axios.get(requestData.url, { headers });
        return response.data;
    } catch (error) {
        handleCustomError(error);
    }
}

async function getTransactionsData() {
    if (!cache.accessToken || !cache.accessTokenSecret || Date.now() > cache.accessTokenExpiryTime) {
        throw new Error('OAuth tokens are not available or expired. Please authenticate first.');
    }

    try {
        const accountList = await getAccountList();
        const accounts = accountList;

        if (!accounts) {
            throw new Error('No accounts found.');
        }

        const accountTransactions = await Promise.all(
            accounts.map(async (account) => {
                const transactions = await getAccountTransactions(account.accountIdKey);
                return {
                    accountId: account.accountIdKey,
                    accountName: account.accountName,
                    transactions,
                };
            })
        );

        return accountTransactions;
    } catch (error) {
        handleCustomError(error);
    }
}

export {
    getTransactionsData,
};
