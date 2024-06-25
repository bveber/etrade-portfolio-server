import { getPortfolioData, flattenPortfolioData } from '../src/routes/portfolio';
import cache from '../src/services/cache';

import axios from 'axios';
import { getAccountList } from '../src/services/getAccountList';
jest.mock('axios');
jest.mock('../src/services/getAccountList');

// Test Suite
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

    test('should throw error if no accounts found', async () => {
        getAccountList.mockResolvedValue(null);

        await expect(getPortfolioData()).rejects.toThrow('No accounts found.');
    });

    test('should throw error if getAccountList throws error', async () => {
        getAccountList.mockRejectedValue(new Error('Test Error'));

        await expect(getPortfolioData()).rejects.toThrow('Test Error');
    });

    test('should throw error if getAccountPortfolio throws error', async () => {
        getAccountList.mockResolvedValue([{ accountIdKey: '123', accountName: 'Test Account' }]);
        axios.get.mockRejectedValue(new Error('Test Error'));

        await expect(getPortfolioData()).rejects.toThrow('Test Error');
    });

    test('should flatten portfolio data with multiple positions', async () => {
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
                                        Quick: { lastTrade: 100 },
                                        marketValue: 1000,
                                    },
                                    {
                                        symbolDescription: 'MSFT',
                                        quantity: 20,
                                        Quick: { lastTrade: 200 },
                                        marketValue: 4000,
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
                accountIds: ['123'],
                accountNames: ['Test Account'],
                symbol: 'MSFT',
                quantity: 20,
                price: 200,
                marketValue: 4000,
            },
            {
                accountIds: ['123'],
                accountNames: ['Test Account'],
                symbol: 'AAPL',
                quantity: 10,
                price: 100,
                marketValue: 1000,
            },
        ]);
    });

    test('should flatten portfolio data with multiple positions and accounts with different symbols', async () => {
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

    test('should throw error if flattenPortfolioData throws error', async () => {
        // Test case where AccountPortfolio in portfolio JSON is undefined
        const portfolios = [
            {
                accountId: '123',
                accountName: 'Test Account 1',
                portfolio: {
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
        ];


        await expect(
            flattenPortfolioData(portfolios)
        ).rejects.toThrow("Cannot read properties of undefined (reading 'AccountPortfolio')");
    });

    test('should throw error if OAuth tokens are not available or expired', async () => {
        cache.accessToken = null;
        cache.accessTokenSecret = null;

        await expect(getPortfolioData()).rejects.toThrow('OAuth tokens are not available or expired. Please authenticate first.');
    });

});
