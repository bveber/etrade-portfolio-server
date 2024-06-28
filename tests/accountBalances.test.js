import { getAccountBalances } from '../src/routes/accountBalances';
import RedisCache from '../src/services/redis';
import { getAccountList } from '../src/services/getAccountList';
import { encrypt } from '../src/services/oauth';

import axios from 'axios';

jest.mock('axios');
jest.mock('../src/services/getAccountList');
jest.mock('../src/services/redis');


describe('Account Balances Service', () => {
    let redisClient;
    beforeAll(() => {
        redisClient = {
            get: jest.fn(),
            set: jest.fn(),
        };
        RedisCache.mockImplementation(() => redisClient);
        const cachedData = {
            oauth_token: 'cached_token',
            encrypted_oauth_token_secret: encrypt('cached_secret')
        };
        redisClient.get.mockResolvedValue(cachedData);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should handle error when getting account list', async () => {
        const error = new Error('Error fetching account balances.');
        getAccountList.mockRejectedValue(error);

        await expect(getAccountBalances()).rejects.toThrow(error);
    });

    it('should handle error when getting empty account list', async () => {
        getAccountList.mockResolvedValue(null);

        await expect(getAccountBalances()).rejects.toThrow('No accounts found.');
    });

    it('should handle error when getting account balances', async () => {
        getAccountList.mockResolvedValue([
            {
                accountIdKey: '123',
                accountId: '456',
                accountName: 'Test Account',
                institutionType: 'BROKERAGE'
            }
        ]);

        const error = new Error('Error fetching account balances.');
        axios.get.mockRejectedValue(error);

        await expect(getAccountBalances()).rejects.toThrow(error);
    });

    it('should handle empty account list', async () => {
        getAccountList.mockResolvedValue([]);

        const result = await getAccountBalances();

        expect(result).toEqual([]);
    });

    it('should handle empty account balances', async () => {
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

    it('should get account balances', async () => {
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
