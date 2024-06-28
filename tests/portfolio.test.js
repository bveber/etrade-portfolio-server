import { getPortfolioData, flattenPortfolioData } from '../src/routes/portfolio';

jest.mock('axios');
jest.mock('../src/services/getAccountList');

// Test Suite
describe('Portfolio Service', () => {
    jest.mock('axios');
    jest.mock('../src/services/getAccountList');

    // Test Suite
    describe('Portfolio Service', () => {
        // Mocked data
        const accountIdKey = '123456789';
        const accessToken = 'access_token';
        const accessTokenSecret = 'access_token_secret';
        const portfolios = [
            { symbol: 'AAPL', quantity: 10, price: 150 },
            { symbol: 'GOOGL', quantity: 5, price: 2500 },
        ];

        // Mocked functions
        const mockGetAccountList = jest.fn(() => Promise.resolve(accountIdKey));
        const mockGetAccessTokenCache = jest.fn(() => Promise.resolve({ accessToken, accessTokenSecret }));
        const mockAxiosGet = jest.fn(() => Promise.resolve({ data: portfolios }));

        // Mock dependencies
        jest.mock('../src/services/getAccountList', () => ({
            getAccountList: mockGetAccountList,
        }));
        jest.mock('../src/services/oauth', () => ({
            getAccessTokenCache: mockGetAccessTokenCache,
        }));
        jest.mock('axios', () => ({
            get: mockAxiosGet,
        }));

        // Test getAccountPortfolio function
        describe('getAccountPortfolio', () => {
            it('should call getAccountList and getAccessTokenCache with correct arguments', async () => {
                await getAccountPortfolio(accountIdKey, accessToken, accessTokenSecret);

                expect(mockGetAccountList).toHaveBeenCalledWith(accountIdKey);
                expect(mockGetAccessTokenCache).toHaveBeenCalledWith(accountIdKey);
            });

            it('should call axios.get with the correct URL', async () => {
                await getAccountPortfolio(accountIdKey, accessToken, accessTokenSecret);

                expect(mockAxiosGet).toHaveBeenCalledWith(`${baseUrl}/v1/accounts/${accountIdKey}/portfolio`);
            });

            it('should return the portfolio data', async () => {
                const result = await getAccountPortfolio(accountIdKey, accessToken, accessTokenSecret);

                expect(result).toEqual(portfolios);
            });

            it('should throw an error if getAccountList throws an error', async () => {
                const errorMessage = 'Error retrieving account list';
                mockGetAccountList.mockRejectedValueOnce(new Error(errorMessage));

                await expect(getAccountPortfolio(accountIdKey, accessToken, accessTokenSecret)).rejects.toThrow(errorMessage);
            });

            it('should throw an error if getAccessTokenCache throws an error', async () => {
                const errorMessage = 'Error retrieving access token cache';
                mockGetAccessTokenCache.mockRejectedValueOnce(new Error(errorMessage));

                await expect(getAccountPortfolio(accountIdKey, accessToken, accessTokenSecret)).rejects.toThrow(errorMessage);
            });

            it('should throw an error if axios.get throws an error', async () => {
                const errorMessage = 'Error retrieving portfolio data';
                mockAxiosGet.mockRejectedValueOnce(new Error(errorMessage));

                await expect(getAccountPortfolio(accountIdKey, accessToken, accessTokenSecret)).rejects.toThrow(errorMessage);
            });
        });

        // Test getPortfolioData function
        describe('getPortfolioData', () => {
            it('should call getAccountPortfolio with the correct arguments', async () => {
                const mockGetAccountPortfolio = jest.fn(() => Promise.resolve(portfolios));
                jest.mock('../src/routes/portfolio', () => ({
                    getAccountPortfolio: mockGetAccountPortfolio,
                }));

                await getPortfolioData();

                expect(mockGetAccountPortfolio).toHaveBeenCalledWith(accountIdKey, accessToken, accessTokenSecret);
            });

            it('should return the flattened portfolio data', async () => {
                const mockFlattenPortfolioData = jest.fn(() => portfolios);
                jest.mock('../src/routes/portfolio', () => ({
                    flattenPortfolioData: mockFlattenPortfolioData,
                }));

                const result = await getPortfolioData();

                expect(result).toEqual(portfolios);
            });
        });

        // Test flattenPortfolioData function
        describe('flattenPortfolioData', () => {
            it('should flatten the portfolio data correctly', () => {
                const flattenedData = flattenPortfolioData(portfolios);

                expect(flattenedData).toEqual([
                    { symbol: 'AAPL', quantity: 10, price: 150, value: 1500 },
                    { symbol: 'GOOGL', quantity: 5, price: 2500, value: 12500 },
                ]);
            });
        });
    });

});
