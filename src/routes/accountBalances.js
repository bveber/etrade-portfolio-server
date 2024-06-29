import axios from 'axios';
import { getAccountList } from '../services/getAccountList.js';
import { oauth, baseUrl, getAccessTokenCache } from '../services/oauth.js';

// Function to get account balance
async function getAccountBalance(accountIdKey, institutionType = 'BROKERAGE') {
    const token = await getAccessTokenCache();
    const requestData = {
        url: `${baseUrl}/v1/accounts/${accountIdKey}/balance?instType=${institutionType}&realTimeNAV=true`,
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
async function getAccountBalances() {
    const accountList = await getAccountList();
    if (!accountList) {
        throw new Error('No accounts found.');
    }
    try {
        const accountBalances = await Promise.all(
            accountList.map(async (account) => {
                const balance = await getAccountBalance(account.accountIdKey, account.institutionType);
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

export {
    getAccountBalances,
};
