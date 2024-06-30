import axios from 'axios';
import { oauth, baseUrl, getDecryptedAccessToken } from './oauth.js';

async function getAccountList() {
    const token = await getDecryptedAccessToken();
    console.log('getAccountList token:', token);

    const requestData = {
        url: `${baseUrl}/v1/accounts/list`,
        method: 'GET',
    };

    const headers = oauth.toHeader(oauth.authorize(requestData, token));

    try {
        console.log('getAccountList requestData:', requestData);
        console.log('getAccountList headers:', headers);
        const response = await axios.get(requestData.url, { headers });
        console.log('response:', response.data);
        return response.data.AccountListResponse.Accounts.Account;
    } catch (error) {
        throw new Error('Error fetching account list.', error);
    }
}

export {
    getAccountList,
};
