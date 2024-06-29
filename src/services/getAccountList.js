import axios from 'axios';
import { oauth, baseUrl, getAccessTokenCache } from './oauth.js';

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
        throw new Error('Error fetching account list.', error);
    }
}

export {
    getAccountList,
};
