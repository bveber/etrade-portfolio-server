import { getTransactionsData } from '../src/routes/transactions';

import axios from 'axios';
import { getAccountList } from '../src/services/getAccountList';
import { getAccessTokenCache } from '../src/services/oauth';

jest.mock('axios');
jest.mock('../src/services/getAccountList');
jest.mock('../src/services/oauth');


describe('Transactions Service', () => {
    beforeAll(() => {
        getAccessTokenCache.mockResolvedValue({
            key: 'cached_token',
            secret: 'cached_secret'
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should get transactions data', async () => {
        getAccountList.mockResolvedValue([{ accountIdKey: '123', accountName: 'Test Account' }]);
        axios.get.mockResolvedValue({ data: 'transactions data' });

        const result = await getTransactionsData();

        expect(result).toEqual([{ accountId: '123', accountName: 'Test Account', transactions: 'transactions data' }]);
    });

    test('should throw error if getAccountList throws error', async () => {
        getAccountList.mockRejectedValue(new Error('Error fetching transactions data.'));

        await expect(getTransactionsData()).rejects.toThrow('Error fetching transactions data.');
    });

    test('should throw error if getAccountTransactions throws error', async () => {
        getAccountList.mockResolvedValue([{ accountIdKey: '123', accountName: 'Test Account' }]);
        axios.get.mockRejectedValue(new Error('Error fetching transactions data.'));

        await expect(getTransactionsData()).rejects.toThrow('Error fetching transactions data.');
    });

    test('should throw error if no accounts are found', async () => {
        getAccountList.mockResolvedValue(null);

        await expect(getTransactionsData()).rejects.toThrow('No accounts found.');
    });

});
