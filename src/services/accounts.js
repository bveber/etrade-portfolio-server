const axios = require('axios');
const { oauth, baseUrl } = require('./oauth');
const cache = require('./cache');
const { handleCustomError } = require('./utils');

async function getAccountList() {
  if (!cache.accessToken || !cache.accessTokenSecret || Date.now() > cache.accessTokenExpiryTime) {
    throw new Error('OAuth tokens are not available or expired. Please authenticate first.');
  }

  const requestData = {
    url: `${baseUrl}/v1/accounts/list`,
    method: 'GET',
  };

  const token = { key: cache.accessToken, secret: cache.accessTokenSecret };
  const headers = oauth.toHeader(oauth.authorize(requestData, token));

  try {
    const response = await axios.get(requestData.url, { headers });
    return response.data.AccountListResponse.Accounts.Account;
  } catch (error) {
    handleCustomError(error);
  }
}

module.exports = {
  getAccountList,
};
