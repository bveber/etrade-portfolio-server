import { getTransactionsData } from '../src/routes/transactions';
import { transactionsKeyGenerator, transactionsTtl } from '../src/services/utils';

import axios from 'axios';
import { oauth } from '../src/services/oauth';

jest.mock('axios');
jest.mock('../src/services/oauth', () => ({
    oauth: {
        toHeader: jest.fn(),
        authorize: jest.fn(),
    },
    getDecryptedAccessToken: jest.fn(),
}));


describe('Transactions Service', () => {
    let redisClient;
    let calledWithHeaders;
    let token;

    beforeAll(() => {
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

        oauth.authorize.mockReturnValue({
            oauth_token: 'oauth_token',
            oauth_token_secret: 'oauth_token_secret',
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should get transactions data', async () => {
        const accountList = [{ accountIdKey: '123', accountName: 'Test Account' }];
        const transactionData = { data: 'transactions data' };
        axios.get.mockResolvedValue(transactionData);

        const result = await getTransactionsData(accountList, token, transactionsKeyGenerator, transactionsTtl, redisClient);

        expect(result).toEqual(
            [
                {
                    accountId: accountList[0].accountIdKey,
                    accountName: accountList[0].accountName,
                    transactions: transactionData.data
                }
            ]
        );
    });

    test('should throw error if getAccountTransactions throws error', async () => {
        const accountList = [{ accountIdKey: '123', accountName: 'Test Account' }];
        axios.get.mockRejectedValue(new Error('Error fetching transactions data.'));

        await expect(
            getTransactionsData(
                accountList,
                token,
                transactionsKeyGenerator,
                transactionsTtl,
                redisClient
            )
        ).rejects.toThrow('Error fetching transactions data.');
    });

    test('should throw error if no accounts are found', async () => {

        await expect(
            getTransactionsData(
                null,
                token,
                transactionsKeyGenerator,
                transactionsTtl,
                redisClient
            )
        ).rejects.toThrow('No accounts found.');
    });

});
