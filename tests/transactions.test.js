const { getTransactionsData } = require('../src/routes/transactions');
const cache = require('../src/services/cache');

jest.mock('axios');
jest.mock('../src/services/getAccountList');
const axios = require('axios');
const { getAccountList } = require('../src/services/getAccountList');

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
});
