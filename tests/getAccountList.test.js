import { getAccountList } from '../src/services/getAccountList';
import { encrypt, baseUrl } from '../src/services/oauth';
import { getAccessTokenCache } from '../src/services/oauth';

import axios from 'axios';

jest.mock('axios');
jest.mock('../src/services/redis');
jest.mock('../src/services/oauth');

describe('getAccountList', () => {
    let redisClient;
    const calledWithUrl = `${baseUrl}/v1/accounts/list`;
    const calledWithHeaders = { 'headers': undefined };

    beforeAll(() => {
        getAccessTokenCache.mockResolvedValue({
            key: 'cached_token',
            secret: 'cached_secret'
        });
        redisClient = {
            get: jest.fn(),
            set: jest.fn(),
        };
        const cachedData = {
            oauth_token: 'cached_token',
            encrypted_oauth_token_secret: encrypt('cached_secret')
        };
        redisClient.get.mockResolvedValue(cachedData);
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

        const result = await getAccountList();

        expect(result).toEqual(mockResponse.data.AccountListResponse.Accounts.Account);
        expect(axios.get).toHaveBeenCalledWith(calledWithUrl, calledWithHeaders);
    });

    it('should throw an error when API call fails', async () => {
        const mockError = new Error('Error fetching account list.');
        axios.get.mockRejectedValue(mockError);

        await expect(getAccountList()).rejects.toThrow(mockError);
        expect(axios.get).toHaveBeenCalledWith(calledWithUrl, calledWithHeaders);
    });
});