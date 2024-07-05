import { getPortfolioData, flattenPortfolioData, enrichPortfolioData } from '../src/routes/portfolio';
import { oauth } from '../src/services/oauth';
import { getStock } from '../src/routes/stock';
import { getPortfolioDataKeyGenerator, getPortfolioDataTtl } from '../src/services/utils';
import axios from 'axios';


jest.mock('axios');
jest.mock('../src/services/oauth', () => ({
    oauth: {
        toHeader: jest.fn(),
        authorize: jest.fn(),
    },
    getDecryptedAccessToken: jest.fn(),
}));
jest.mock('../src/routes/stock', () => ({
    getStock: jest.fn(),
}));

describe('Portfolio Service', () => {
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

    describe('getPortfolioData', () => {

        it('should handle error when no accounts are found', async () => {
            const accountList = null;

            await expect(
                getPortfolioData(
                    accountList,
                    token,
                    getPortfolioDataKeyGenerator,
                    getPortfolioDataTtl,
                    redisClient
                )
            ).rejects.toThrow('No accounts found.');
        });

        it('should handle error when getting account portfolio', async () => {
            const accountList = [
                { accountIdKey: '123', accountName: 'Test Account' }
            ];

            const error = new Error('Error fetching account portfolio.');
            axios.get.mockRejectedValue(error);

            await expect(
                getPortfolioData(
                    accountList,
                    token,
                    getPortfolioDataKeyGenerator,
                    getPortfolioDataTtl,
                    redisClient
                )
            ).rejects.toThrow(error);
        });

        it('should return portfolio data for accounts', async () => {
            const accountList = [
                { accountIdKey: '123', accountName: 'Test Account' }
            ];

            const portfolioResponse = { PortfolioResponse: { AccountPortfolio: [{ Position: [] }] } };
            axios.get.mockResolvedValue({
                data: portfolioResponse
            });

            const result = await getPortfolioData(accountList, token, getPortfolioDataKeyGenerator, getPortfolioDataTtl, redisClient);

            expect(result).toEqual([
                {
                    accountId: accountList[0].accountIdKey,
                    accountName: accountList[0].accountName,
                    portfolio: portfolioResponse
                }
            ]);
        });

        it('should return portfolio data for multiple accounts', async () => {
            const accountList = [
                { accountIdKey: '123', accountName: 'Test Account' },
                { accountIdKey: '456', accountName: 'Test Account 2' }
            ];

            const portfolioResponse = { PortfolioResponse: { AccountPortfolio: [{ Position: [] }] } };
            axios.get.mockResolvedValue({
                data: portfolioResponse
            });

            const result = await getPortfolioData(accountList, token, getPortfolioDataKeyGenerator, getPortfolioDataTtl, redisClient);

            expect(result).toEqual([
                {
                    accountId: accountList[0].accountIdKey,
                    accountName: accountList[0].accountName,
                    portfolio: portfolioResponse
                },
                {
                    accountId: accountList[1].accountIdKey,
                    accountName: accountList[1].accountName,
                    portfolio: portfolioResponse
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

    describe('enrichPortfolioData', () => {
        it('should handle error during enriching portfolio data', async () => {
            const flattenedPortfolioData = [
                {
                    accountIds: ['123'],
                    accountNames: ['Test Account'],
                    symbol: 'AAPL',
                    quantity: 10,
                    price: 150,
                    marketValue: 1500
                }
            ];

            getStock.mockRejectedValue(new Error('Error fetching stock data.'));

            await expect(enrichPortfolioData(flattenedPortfolioData, redisClient)).rejects.toThrow('Error enriching portfolio data.');
        });

        it('should return enriched portfolio data', async () => {
            const flattenedPortfolioData = [
                {
                    accountIds: ['123'],
                    accountNames: ['Test Account'],
                    symbol: 'AAPL',
                    quantity: 10,
                    price: 150,
                    marketValue: 1500
                }
            ];

            const stockData = {
                latestPrice: 150,
                marketCap: 2000000,
            };

            getStock.mockResolvedValue(stockData);

            const result = await enrichPortfolioData(flattenedPortfolioData, redisClient);

            expect(result).toEqual([
                {
                    accountIds: ['123'],
                    accountNames: ['Test Account'],
                    symbol: 'AAPL',
                    quantity: 10,
                    price: 150,
                    marketValue: 1500,
                    stockData,
                }
            ]);
        });

        it('should return enriched portfolio data for multiple symbols', async () => {
            const flattenedPortfolioData = [
                {
                    accountIds: ['123'],
                    accountNames: ['Test Account'],
                    symbol: 'AAPL',
                    quantity: 10,
                    price: 150,
                    marketValue: 1500
                },
                {
                    accountIds: ['456'],
                    accountNames: ['Test Account 2'],
                    symbol: 'GOOGL',
                    quantity: 5,
                    price: 400,
                    marketValue: 2000
                }
            ];

            const stockDataAAPL = {
                latestPrice: 150,
                marketCap: 2000000,
            };

            const stockDataGOOGL = {
                latestPrice: 400,
                marketCap: 5000000,
            };

            getStock
                .mockResolvedValueOnce(stockDataAAPL)
                .mockResolvedValueOnce(stockDataGOOGL);

            const result = await enrichPortfolioData(flattenedPortfolioData, redisClient);

            expect(result).toEqual([
                {
                    accountIds: ['123'],
                    accountNames: ['Test Account'],
                    symbol: 'AAPL',
                    quantity: 10,
                    price: 150,
                    marketValue: 1500,
                    stockData: stockDataAAPL,
                },
                {
                    accountIds: ['456'],
                    accountNames: ['Test Account 2'],
                    symbol: 'GOOGL',
                    quantity: 5,
                    price: 400,
                    marketValue: 2000,
                    stockData: stockDataGOOGL,
                }
            ]);
        });
    });
});
