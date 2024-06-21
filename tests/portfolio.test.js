const { getPortfolioData } = require('../src/routes/portfolio');
const cache = require('../src/services/cache');

jest.mock('axios');
jest.mock('../src/services/getAccountList');
const axios = require('axios');
const { getAccountList } = require('../src/services/getAccountList');

describe('Portfolio Service', () => {
    beforeAll(() => {
        cache.accessToken = 'accessToken';
        cache.accessTokenSecret = 'accessTokenSecret';
        cache.accessTokenExpiryTime = Date.now() + 100000;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should get portfolio data', async () => {
        getAccountList.mockResolvedValue([{ accountIdKey: '123', accountName: 'Test Account' }]);
        axios.get.mockResolvedValue({ data: 'portfolio data' });

        const result = await getPortfolioData();

        expect(result).toEqual([{ accountId: '123', accountName: 'Test Account', portfolio: 'portfolio data' }]);
    });
});