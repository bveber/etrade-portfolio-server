const { getAccountList } = require('./accounts');
const { oauth, baseUrl } = require('./oauth');
const cache = require('./cache');
const { handleCustomError } = require('./utils');
const axios = require('axios');

// Function to get account balance
async function getAccountBalance(accountIdKey, institutionType = 'BROKERAGE') {
    const requestData = {
      url: `${baseUrl}/v1/accounts/${accountIdKey}/balance?instType=${institutionType}&realTimeNAV=true`,
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
  
// Function to get account balances
async function getAccountBalances() {
    if (!cache.accessToken || !cache.accessTokenSecret || Date.now() > cache.accessTokenExpiryTime) {
        throw new Error('OAuth tokens are not available or expired. Please authenticate first.');
    }

    try {
        const accountList = await getAccountList();
        const accounts = accountList;

        if (!accounts) {
        throw new Error('No accounts found.');
        }

        const accountBalances = await Promise.all(
        accounts.map(async (account) => {
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
        handleCustomError(error);
    }
}

module.exports = {
    getAccountBalances,
  };