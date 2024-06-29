import axios from 'axios';
import { getAccountList } from '../services/getAccountList.js';
import { oauth, baseUrl, getAccessTokenCache } from '../services/oauth.js';

async function getAccountTransactions(accountIdKey) {
    const token = await getAccessTokenCache();
    const requestData = {
        url: `${baseUrl}/v1/accounts/${accountIdKey}/transactions?count=50`,
        method: 'GET',
    };

    // const token = { key: accessToken.oauth_token, secret: accessToken.oauth_secret };
    const headers = oauth.toHeader(oauth.authorize(requestData, token));

    try {
        const response = await axios.get(requestData.url, { headers });
        return response.data;
    } catch (error) {
        throw new Error('Error fetching account transactions.', error);
    }
}

async function getTransactionsData() {
    const accountList = await getAccountList();
    const accounts = accountList;

    if (!accounts) {
        throw new Error('No accounts found.');
    }
    try {
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
        throw new Error('Error fetching transactions data.', error);
    }
}

export {
    getTransactionsData,
};
