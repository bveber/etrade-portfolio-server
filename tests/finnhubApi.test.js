import { getCompanyData } from '../src/routes/finnhubApi';
import { DefaultApi, ApiClient } from 'finnhub';
import { finnhubApiKeyGenerator, finnhubApiTtl } from '../src/services/utils';

jest.mock('finnhub');

describe('Finnhub Service', () => {
    let redisClient;
    let finnhubClient;
    let apiClientInstance;

    beforeAll(() => {
        // Mock Redis client
        redisClient = {
            get: jest.fn(),
            set: jest.fn(),
            quit: jest.fn(),
        };

        // Mock Finnhub client
        finnhubClient = {
            companyProfile2: jest.fn(),
        };

        // Mock ApiClient instance and its authentications
        apiClientInstance = { authentications: { 'api_key': { apiKey: '' } } };
        ApiClient.instance = apiClientInstance;
        DefaultApi.mockImplementation(() => finnhubClient);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return cached data if available', async () => {
        const ticker = 'AAPL';
        const cachedData = { name: 'Apple Inc.' };

        redisClient.get.mockResolvedValue(cachedData);

        const result = await getCompanyData(ticker, finnhubApiKeyGenerator, finnhubApiTtl, redisClient);

        expect(redisClient.get).toHaveBeenCalledWith(finnhubApiKeyGenerator(ticker));
        expect(result).toEqual(cachedData);
    });

    it('should fetch data from Finnhub API and cache it if not in cache', async () => {
        const ticker = 'AAPL';
        const apiData = { name: 'Apple Inc.' };

        redisClient.get.mockResolvedValue(null);
        finnhubClient.companyProfile2.mockImplementation((params, callback) => {
            callback(null, apiData);
        });

        // Set the API key before making the request
        process.env.FINNHUB_API_KEY = 'test_api_key';
        apiClientInstance.authentications['api_key'].apiKey = process.env.FINNHUB_API_KEY;

        const result = await getCompanyData(ticker, finnhubApiKeyGenerator, finnhubApiTtl, redisClient);

        expect(redisClient.get).toHaveBeenCalledWith(finnhubApiKeyGenerator(ticker));
        expect(finnhubClient.companyProfile2).toHaveBeenCalledWith({ symbol: ticker }, expect.any(Function));
        expect(redisClient.set).toHaveBeenCalledWith(finnhubApiKeyGenerator(ticker), apiData, finnhubApiTtl);
        expect(result).toEqual(apiData);
    });

    it('should throw an error if Finnhub API call fails', async () => {
        const ticker = 'AAPL';
        const error = new Error('API call failed');

        redisClient.get.mockResolvedValue(null);
        finnhubClient.companyProfile2.mockImplementation((params, callback) => {
            callback(error);
        });

        await expect(getCompanyData(ticker, finnhubApiKeyGenerator, finnhubApiTtl, redisClient)).rejects.toThrow(error);

        expect(redisClient.get).toHaveBeenCalledWith(finnhubApiKeyGenerator(ticker));
        expect(finnhubClient.companyProfile2).toHaveBeenCalledWith({ symbol: ticker }, expect.any(Function));
    });
});
