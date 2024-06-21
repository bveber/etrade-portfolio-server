const { getAccountList } = require('../services/accounts');
const { oauth, baseUrl } = require('../services/oauth');
const cache = require('../services/cache');
const { handleCustomError } = require('../services/utils');
const axios = require('axios');

async function getAccountPortfolio(accountIdKey) {
    const requestData = {
      url: `${baseUrl}/v1/accounts/${accountIdKey}/portfolio`,
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

async function getPortfolioData() {
  if (!cache.accessToken || !cache.accessTokenSecret || Date.now() > cache.accessTokenExpiryTime) {
    throw new Error('OAuth tokens are not available or expired. Please authenticate first.');
  }

  try {
    const accountList = await getAccountList();
    const accounts = accountList;

    if (!accounts) {
      throw new Error('No accounts found.');
    }

    const accountPortfolios = await Promise.all(
      accounts.map(async (account) => {
        const portfolio = await getAccountPortfolio(account.accountIdKey);
        return {
          accountId: account.accountIdKey,
          accountName: account.accountName,
          portfolio,
        };
      })
    );

    return accountPortfolios;
  } catch (error) {
    handleCustomError(error);
  }
}

module.exports = {
  getPortfolioData,
};
