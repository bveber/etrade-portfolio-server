import { getAccountBalances } from '../src/routes/accountBalances';
import { getAccountList } from '../src/services/getAccountList';
import cache from '../src/services/cache';

import axios from 'axios';

jest.mock('axios');
jest.mock('../src/services/getAccountList');


describe('Account Balances Service', () => {
    beforeAll(() => {
        cache.accessToken = 'accessToken';
        cache.accessTokenSecret = 'accessTokenSecret';
        cache.accessTokenExpiryTime = Date.now() + 100000;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should handle error when getting account list', async () => {
        const error = new Error('Failed to get account list');
        getAccountList.mockRejectedValue(error);

        await expect(getAccountBalances()).rejects.toThrow(error);
    });

    test('should handle error when getting account balances', async () => {
        getAccountList.mockResolvedValue([
            { 
                accountIdKey: '123', 
                accountId: '456', 
                accountName: 'Test Account', 
                institutionType: 'BROKERAGE' 
            }
        ]);

        const error = new Error('Failed to get account balances');
        axios.get.mockRejectedValue(error);

        await expect(getAccountBalances()).rejects.toThrow(error);
    });

    test('should handle empty account list', async () => {
        getAccountList.mockResolvedValue([]);

        const result = await getAccountBalances();

        expect(result).toEqual([]);
    });

    test('should handle empty account balances', async () => {
        getAccountList.mockResolvedValue([
            { 
                accountIdKey: '123', 
                accountId: '456', 
                accountName: 'Test Account', 
                institutionType: 'BROKERAGE' 
            }
        ]);

        axios.get.mockResolvedValue({ data: null });

        const result = await getAccountBalances();

        expect(result).toEqual([
            { 
                accountId: '456', 
                accountName: 'Test Account', 
                balance: null 
            }
        ]);
    });

    test('should get account balances', async () => {
        getAccountList.mockResolvedValue(
            [
                { 
                    accountIdKey: '123', 
                    accountId: '456', 
                    accountName: 'Test Account', 
                    institutionType: 'BROKERAGE' 
                }
            ]
        );
        axios.get.mockResolvedValue({ data: 'balance data' });

        const result = await getAccountBalances();

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
