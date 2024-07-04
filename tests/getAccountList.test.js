import { getAccountList } from '../src/services/getAccountList';
import { oauth } from '../src/services/oauth';
import { getAccountListKeyGenerator, getAccountListTtl, etradeBaseUrl } from '../src/services/utils';

import axios from 'axios';

jest.mock('axios');
jest.mock('../src/services/oauth', () => ({
    oauth: {
        toHeader: jest.fn(),
        authorize: jest.fn(),
    },
    getDecryptedAccessToken: jest.fn(),
}));

describe('getAccountList', () => {
    let redisClient;
    let calledWithUrl;
    let calledWithHeaders;
    let mockHeaders;
    let token;

    beforeEach(() => {
        calledWithUrl = `${etradeBaseUrl}/v1/accounts/list`;
        calledWithHeaders = {
            Authorization: 'OAuth oauth_token="cached_token", oauth_token_secret="cached_secret"',
        };
        redisClient = {
            get: jest.fn(),
            set: jest.fn(),
            quit: jest.fn(),
        };

        token = {
            key: 'cached_token',
            secret: 'cached_secret'
        };

        oauth.toHeader.mockReturnValue(calledWithHeaders);
        mockHeaders = oauth.toHeader(oauth.authorize({ url: calledWithUrl, method: 'GET' }, { key: 'cached_token', secret: 'cached_secret' }));

        oauth.authorize.mockReturnValue({
            oauth_token: 'oauth_token',
            oauth_token_secret: 'oauth_token_secret',
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return account list when API call is successful', async () => {
        const mockResponse = {
            data:
            {
                AccountListResponse:
                {
                    Accounts:
                    {
                        Account: [
                            { id: 1, name: 'Account 1' },
                            { id: 2, name: 'Account 2' },
                        ],
                    }
                }
            }
        };

        axios.get.mockResolvedValue(mockResponse);

        const result = await getAccountList(token, getAccountListKeyGenerator, getAccountListTtl, redisClient);

        expect(result).toEqual(mockResponse.data.AccountListResponse.Accounts.Account);
        expect(axios.get).toHaveBeenCalledWith(calledWithUrl, { headers: mockHeaders });
    });

    it('should throw an error when API call fails', async () => {
        const mockError = new Error('Error fetching account list.');
        axios.get.mockRejectedValue(mockError);

        await expect(getAccountList(token, getAccountListKeyGenerator, getAccountListTtl, redisClient)).rejects.toThrow(mockError);
        expect(axios.get).toHaveBeenCalledWith(calledWithUrl, { headers: mockHeaders });
    });
});