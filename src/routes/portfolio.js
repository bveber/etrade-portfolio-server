import axios from 'axios';
import { getAccountList } from '../services/getAccountList.js';
import { oauth, baseUrl } from '../services/oauth.js';
import cache from '../services/cache.js';
import handleCustomError from '../services/utils.js';

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
        if (!accountList) {
            throw new Error('No accounts found.');
        }

        const accountPortfolios = await Promise.all(
            accountList.map(async (account) => {
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

export {
    getPortfolioData,
};
