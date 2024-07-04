import axios from 'axios';
import { oauth } from '../services/oauth.js';
import { etradeBaseUrl } from '../services/utils.js';
import withCache from '../services/redis.js';

async function getAccountTransactions(accountIdKey, token) {
    const requestData = {
        url: `${etradeBaseUrl}/v1/accounts/${accountIdKey}/transactions?count=50`,
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

async function getTransactionsDataWithoutCache(accountList, token) {
    if (!accountList) {
        throw new Error('No accounts found.');
    }
    try {
        const accountTransactions = await Promise.all(
            accountList.map(async (account) => {
                const transactions = await getAccountTransactions(account.accountIdKey, token);
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

const getTransactionsData = (
    accountList,
    token,
    transactionsKeyGenerator,
    transactionsTtl,
    redisClient
) => withCache(
    transactionsKeyGenerator, transactionsTtl, redisClient
)(getTransactionsDataWithoutCache)(accountList, token);

export {
    getTransactionsData,
};
