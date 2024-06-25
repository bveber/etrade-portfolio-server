import { getTransactionsData } from '../src/routes/transactions';
import cache from '../src/services/cache';


import axios from 'axios';
import { getAccountList } from '../src/services/getAccountList';
jest.mock('axios');
jest.mock('../src/services/getAccountList');


describe('Transactions Service', () => {
    beforeAll(() => {
        cache.accessToken = 'accessToken';
        cache.accessTokenSecret = 'accessTokenSecret';
        cache.accessTokenExpiryTime = Date.now() + 100000;
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

    test('should throw error if no accounts found', async () => {
        getAccountList.mockResolvedValue(null);

        await expect(getTransactionsData()).rejects.toThrow('No accounts found.');
    });

    test('should throw error if getAccountList throws error', async () => {
        getAccountList.mockRejectedValue(new Error('Test Error'));

        await expect(getTransactionsData()).rejects.toThrow('Test Error');
    });

    test('should throw error if getAccountTransactions throws error', async () => {
        getAccountList.mockResolvedValue([{ accountIdKey: '123', accountName: 'Test Account' }]);
        axios.get.mockRejectedValue(new Error('Test Error'));

        await expect(getTransactionsData()).rejects.toThrow('Test Error');
    });

});
