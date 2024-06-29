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

        it('should handle error when no accounts are found', async () => {
            getAccountList.mockResolvedValue(null);

            await expect(getPortfolioData()).rejects.toThrow('No accounts found.');
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

        it('should return portfolio data for multiple accounts', async () => {
            getAccountList.mockResolvedValue([
                { accountIdKey: '123', accountName: 'Test Account' },
                { accountIdKey: '456', accountName: 'Test Account 2' }
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
                },
                {
                    accountId: '456',
                    accountName: 'Test Account 2',
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

        it('should return flattened portfolio data for multiple accounts', async () => {
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
                },
                {
                    accountId: '456',
                    accountName: 'Test Account 2',
                    portfolio: {
                        PortfolioResponse: {
                            AccountPortfolio: [
                                {
                                    Position: [
                                        {
                                            symbolDescription: 'GOOGL',
                                            quantity: 5,
                                            marketValue: 2000,
                                            Quick: { lastTrade: 400 }
                                        }
                                    ]
                                }
                            ]
                        }
                    }
                }
            ];

            const expectedResult = [
                {
                    accountIds: ['456'],
                    accountNames: ['Test Account 2'],
                    symbol: 'GOOGL',
                    quantity: 5,
                    price: 400,
                    marketValue: 2000
                },
                {
                    accountIds: ['123'],
                    accountNames: ['Test Account'],
                    symbol: 'AAPL',
                    quantity: 10,
                    price: 150,
                    marketValue: 1500
                },
            ];

            const result = await flattenPortfolioData(portfolios);
            console.log('result', result);
            console.log('expectedResult', expectedResult);
            expect(result).toEqual(expectedResult);
        });

        it('should flatten portfolio data with multiple positions and accounts with different symbols', async () => {
            const portfolios = [
                {
                    accountId: '123',
                    accountName: 'Test Account 1',
                    portfolio: {
                        PortfolioResponse: {
                            AccountPortfolio: [
                                {
                                    Position: [
                                        {
                                            symbolDescription: 'AAPL',
                                            quantity: 10,
                                            Quick: { lastTrade: 100 },
                                            marketValue: 1000,
                                        },
                                        {
                                            symbolDescription: 'MSFT',
                                            quantity: 10,
                                            Quick: { lastTrade: 200 },
                                            marketValue: 2000,
                                        },
                                    ],
                                },
                            ],
                        },
                    },
                },
                {
                    accountId: '456',
                    accountName: 'Test Account 2',
                    portfolio: {
                        PortfolioResponse: {
                            AccountPortfolio: [
                                {
                                    Position: [
                                        {
                                            symbolDescription: 'GOOGL',
                                            quantity: 20,
                                            Quick: { lastTrade: 100 },
                                            marketValue: 2000,
                                        },
                                        {
                                            symbolDescription: 'MSFT',
                                            quantity: 30,
                                            Quick: { lastTrade: 200 },
                                            marketValue: 6000,
                                        },
                                    ],
                                },
                            ],
                        },
                    },
                },
            ];

            const result = await flattenPortfolioData(portfolios);
            console.log('portfolio test result ', result);

            expect(result).toEqual([
                {
                    accountIds: ['123', '456'],
                    accountNames: ['Test Account 1', 'Test Account 2'],
                    symbol: 'MSFT',
                    quantity: 40,
                    price: 200,
                    marketValue: 8000,
                },
                {
                    accountIds: ['456'],
                    accountNames: ['Test Account 2'],
                    symbol: 'GOOGL',
                    quantity: 20,
                    price: 100,
                    marketValue: 2000,
                },
                {
                    accountIds: ['123'],
                    accountNames: ['Test Account 1'],
                    symbol: 'AAPL',
                    quantity: 10,
                    price: 100,
                    marketValue: 1000,
                },
            ]);
        });
    });
});
