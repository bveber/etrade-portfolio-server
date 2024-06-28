import { getPortfolioData, flattenPortfolioData } from '../src/routes/portfolio';
import { getAccountList } from '../src/services/getAccountList';
import { getAccessTokenCache } from '../src/services/oauth';
import axios from 'axios';

jest.mock('axios');
jest.mock('../src/services/getAccountList');
jest.mock('../src/services/oauth');

describe('Portfolio Service', () => {

    beforeAll(() => {
        getAccessTokenCache.mockResolvedValue({
            key: 'cached_token',
            secret: 'cached_secret'
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getPortfolioData', () => {
        it('should handle error when getting account list', async () => {
            const error = new Error('Error fetching portfolio data.');
            getAccountList.mockRejectedValue(error);

            await expect(getPortfolioData()).rejects.toThrow(error);
        });

        it('should handle error when getting account portfolio', async () => {
            getAccountList.mockResolvedValue([
                { accountIdKey: '123', accountName: 'Test Account' }
            ]);

            const error = new Error('Error fetching portfolio data.');
            axios.get.mockRejectedValue(error);

            await expect(getPortfolioData()).rejects.toThrow(error);
        });

        it('should return portfolio data for accounts', async () => {
            getAccountList.mockResolvedValue([
                { accountIdKey: '123', accountName: 'Test Account' }
            ]);

            axios.get.mockResolvedValue({
                data: { PortfolioResponse: { AccountPortfolio: [{ Position: [] }] } }
            });

            const result = await getPortfolioData();

            expect(result).toEqual([
                {
                    accountId: '123',
                    accountName: 'Test Account',
                    portfolio: { PortfolioResponse: { AccountPortfolio: [{ Position: [] }] } }
                }
            ]);
        });
    });

    describe('flattenPortfolioData', () => {
        it('should handle error during flattening portfolio data', async () => {
            const portfolios = [
                {
                    accountId: '123',
                    accountName: 'Test Account',
                    portfolio: { PortfolioResponse: { AccountPortfolio: [{ Position: null }] } }
                }
            ];

            await expect(flattenPortfolioData(portfolios)).rejects.toThrow('Error flattening portfolio data.');
        });

        it('should return flattened portfolio data', async () => {
            const portfolios = [
                {
                    accountId: '123',
                    accountName: 'Test Account',
                    portfolio: {
                        PortfolioResponse: {
                            AccountPortfolio: [
                                {
                                    Position: [
                                        {
                                            symbolDescription: 'AAPL',
                                            quantity: 10,
                                            marketValue: 1500,
                                            Quick: { lastTrade: 150 }
                                        }
                                    ]
                                }
                            ]
                        }
                    }
                }
            ];

            const result = await flattenPortfolioData(portfolios);

            expect(result).toEqual([
                {
                    accountIds: ['123'],
                    accountNames: ['Test Account'],
                    symbol: 'AAPL',
                    quantity: 10,
                    price: 150,
                    marketValue: 1500
                }
            ]);
        });
    });
});
