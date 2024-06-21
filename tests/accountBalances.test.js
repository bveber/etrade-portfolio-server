const { getAccountBalances } = require('../src/routes/accountBalances');
const cache = require('../src/services/cache');

jest.mock('axios');
jest.mock('../src/services/getAccountList');
const axios = require('axios');
const { getAccountList } = require('../src/services/getAccountList');

describe('Account Balances Service', () => {
    beforeAll(() => {
        cache.accessToken = 'accessToken';
        cache.accessTokenSecret = 'accessTokenSecret';
        cache.accessTokenExpiryTime = Date.now() + 100000;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should get account balances', async () => {
        getAccountList.mockResolvedValue([{ accountIdKey: '123', accountId: '456', accountName: 'Test Account', institutionType: 'BROKERAGE' }]);
        axios.get.mockResolvedValue({ data: 'balance data' });

        const result = await getAccountBalances();

        expect(result).toEqual([{ accountId: '456', accountName: 'Test Account', balance: 'balance data' }]);
    });
});
