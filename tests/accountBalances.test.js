import { getAccountBalances } from '../src/routes/accountBalances';
import { getDecryptedAccessToken, oauth } from '../src/services/oauth';
import { getAccountBalancesKeyGenerator, getAccountBalancesTtl } from '../src/services/utils';

import axios from 'axios';

jest.mock('axios');
jest.mock('../src/services/getAccountList', () => ({
    getAccountList: jest.fn(),
}));
jest.mock('../src/services/oauth', () => ({
    oauth: {
        toHeader: jest.fn(),
        authorize: jest.fn(),
    },
    getDecryptedAccessToken: jest.fn(),
}));


describe('Account Balances Service', () => {
    let redisClient;
    let calledWithHeaders;
    let token;

    beforeEach(() => {
        calledWithHeaders = {
            Authorization: 'OAuth oauth_token="cached_token", oauth_token_secret="cached_secret"',
        };
        redisClient = {
            get: jest.fn(),
            set: jest.fn(),
            quit: jest.fn(),
        };
        getDecryptedAccessToken.mockResolvedValue({
            key: 'cached_token',
            secret: 'cached_secret'
        });
        token = getDecryptedAccessToken();

        oauth.toHeader.mockReturnValue(calledWithHeaders);

        oauth.authorize.mockReturnValue({
            oauth_token: 'oauth_token',
            oauth_token_secret: 'oauth_token_secret',
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should handle error when getting undefined accountList', async () => {
        const accountList = undefined;

        await expect(
            getAccountBalances(accountList, token, getAccountBalancesKeyGenerator, getAccountBalancesTtl, redisClient)
        ).rejects.toThrow('No accounts found.');
    });

    it('should handle error when getting account balances', async () => {
        const accountList = [
            {
                accountIdKey: '123',
                accountId: '456',
                accountName: 'Test Account',
                institutionType: 'BROKERAGE'
            }
        ];

        const error = new Error('Error fetching account balances.');
        axios.get.mockRejectedValue(error);

        await expect(
            getAccountBalances(accountList, token, getAccountBalancesKeyGenerator, getAccountBalancesTtl, redisClient)
        ).rejects.toThrow(error);
    });

    it('should handle empty account list', async () => {
        const accountList = [];

        const result = await getAccountBalances(accountList, token, getAccountBalancesKeyGenerator, getAccountBalancesTtl, redisClient);

        expect(result).toEqual([]);
    });

    it('should handle empty account balances', async () => {
        const accountList = [
            {
                accountIdKey: '123',
                accountId: '456',
                accountName: 'Test Account',
                institutionType: 'BROKERAGE'
            }
        ];

        axios.get.mockResolvedValue({ data: null });

        const result = await getAccountBalances(accountList, token, getAccountBalancesKeyGenerator, getAccountBalancesTtl, redisClient);

        expect(result).toEqual([
            {
                accountId: '456',
                accountName: 'Test Account',
                balance: null
            }
        ]);
    });

    it('should get account balances', async () => {
        const accountList = [
            {
                accountIdKey: '123',
                accountId: '456',
                accountName: 'Test Account',
                institutionType: 'BROKERAGE'
            }
        ];
        axios.get.mockResolvedValue({ data: 'balance data' });

        const result = await getAccountBalances(accountList, token, getAccountBalancesKeyGenerator, getAccountBalancesTtl, redisClient);

        expect(result).toEqual(
            [
                {
                    accountId: '456',
                    accountName: 'Test Account',
                    balance: 'balance data'
                }
            ]
        );
    });
});
