import { config } from 'dotenv';
// import { getRequestToken, getAccessToken, encrypt, decrypt, getAccessTokenCache } from '../src/services/oauth';
import * as oauthServices from '../src/services/oauth';
import RedisCache from '../src/services/redis';
import axios from 'axios';

config();

jest.mock('axios');
jest.mock('../src/services/redis');


describe('OAuth Service', () => {
    let redisClient;

    beforeEach(() => {
        redisClient = {
            get: jest.fn(),
            set: jest.fn(),
        };
        RedisCache.mockImplementation(() => redisClient);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getRequestToken', () => {

        it('should return cached data if available', async () => {
            const cachedData = {
                oauth_token: 'cached_token',
                encrypted_oauth_token_secret: 'cached_secret'
            };
            redisClient.get.mockResolvedValue(cachedData);
            const result = await oauthServices.getRequestToken();
            expect(result).toEqual(cachedData);
            expect(redisClient.get).toHaveBeenCalledWith('oauth:getRequestToken');
        });

        it('should request new token if no cached data', async () => {
            redisClient.get.mockResolvedValue(null);
            const responseData = 'oauth_token=new_token&oauth_token_secret=new_secret';
            axios.post.mockResolvedValue({ data: responseData });

            const result = await oauthServices.getRequestToken();
            expect(result).toEqual({ oauth_token: 'new_token', oauth_token_secret: 'new_secret' });
            expect(redisClient.set).toHaveBeenCalledWith('oauth:getRequestToken', { oauth_token: 'new_token', oauth_token_secret: 'new_secret' }, 300);
        });

        it('should throw error if request fails', async () => {
            redisClient.get.mockResolvedValue(null);
            axios.post.mockRejectedValue(new Error('Request failed'));

            await expect(oauthServices.getRequestToken()).rejects.toThrow('Request failed');
        });

        it ('should throw error if response does not contain token', async () => {
            redisClient.get.mockResolvedValue(null);
            axios.post.mockResolvedValue({ data: 'invalid_response' });

            await expect(oauthServices.getRequestToken()).rejects.toThrow('Failed to get request token');
        });
    });

    describe('getAccessToken', () => {
        it('should return cached data if available', async () => {
            const cachedData = {
                oauth_token: 'cached_token',
                encrypted_oauth_token_secret: oauthServices.encrypt('cached_secret')
            };
            redisClient.get.mockResolvedValue(cachedData);

            const result = await oauthServices.getAccessToken('verifier');
            expect(result).toEqual({ oauth_token: 'cached_token', oauth_token_secret: 'cached_secret' });
        });

        it('should request new access token if no cached data', async () => {
            const mockGet = redisClient.get.mockResolvedValue(null);
            const requestTokenData = { oauth_token: 'request_token', oauth_token_secret: 'request_secret' };
            const responseData = {
                oauth_token: 'new_token',
                oauth_token_secret: 'new_secret'
            };
            axios.post.mockResolvedValue({ data: responseData });

            jest.spyOn(oauthServices, 'getRequestToken').mockResolvedValue(requestTokenData);

            const result = await oauthServices.getAccessToken('verifier');
            expect(result.oauth_token).toEqual(responseData.oauth_token);
            expect(oauthServices.decrypt(result.encrypted_oauth_token_secret)).toEqual(responseData.oauth_token_secret);
            mockGet.mockRestore();
        });

        it('should throw error if verifier is missing', async () => {
            await expect(oauthServices.getAccessToken()).rejects.toThrow('Verifier is missing');
        });

        it('should throw error if request fails', async () => {
            redisClient.get.mockResolvedValue(null);
            axios.post.mockRejectedValue(new Error('Request failed'));

            await expect(oauthServices.getAccessToken('verifier')).rejects.toThrow('Request failed');
        });

    });

    describe('Encryption and Decryption', () => {
        it('should encrypt and decrypt data correctly', () => {
            const text = 'Hello, world!';
            const encrypted = oauthServices.encrypt(text);
            const decrypted = oauthServices.decrypt(encrypted);

            expect(decrypted).toEqual(text);
        });
    });

    describe('getAccessTokenCache', () => {
        it('should return cached data if available', async () => {
            const cachedData = {
                oauth_token: 'cached_token',
                encrypted_oauth_token_secret: oauthServices.encrypt('totally_encrypted_cached_secret')
            };
            redisClient.get.mockResolvedValue(cachedData);

            const result = await oauthServices.getAccessTokenCache();
            expect(result).toEqual({ key: cachedData.oauth_token, secret: oauthServices.decrypt(cachedData.encrypted_oauth_token_secret) });
        });

        it('should throw error if no cached data', async () => {
            redisClient.get.mockResolvedValue(null);
            await expect(oauthServices.getAccessTokenCache()).rejects.toThrow('OAuth tokens are not available or expired. Please authenticate first.');
        });
    });
});
