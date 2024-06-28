import axios from 'axios';
import { oauth, baseUrl, getAccessTokenCache } from './oauth.js';
import handleCustomError from './errorHandler.js';

async function getAccountList() {
    const token = await getAccessTokenCache();

    const requestData = {
        url: `${baseUrl}/v1/accounts/list`,
        method: 'GET',
    };

    const headers = oauth.toHeader(oauth.authorize(requestData, token));

    try {
        const response = await axios.get(requestData.url, { headers });
        return response.data.AccountListResponse.Accounts.Account;
    } catch (error) {
        handleCustomError(error);
    }
}

export {
    getAccountList,
};
