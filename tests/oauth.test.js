import { config } from 'dotenv';
import * as oauthServices from '../src/services/oauth';
import {
    requestTokenKeyGenerator,
    requestTokenTtl,
    accessTokenKeyGenerator,
    accessTokenTtl,
} from '../src/services/utils.js';
import axios from 'axios';

config();

jest.mock('axios');

describe('OAuth Service', () => {
    let redisClient;
    let requestTokenData;

    beforeEach(() => {
        redisClient = {
            get: jest.fn(),
            set: jest.fn(),
            quit: jest.fn(),
        };
        requestTokenData = {
            oauth_token: 'request_token',
            oauth_token_secret: 'request_secret'
        };
    });

    afterEach(() => {
        redisClient.quit();
        jest.clearAllMocks();
    });

    afterAll(() => {
        jest.restoreAllMocks();
        redisClient.quit();
    });

    describe('getRequestToken', () => {

        it('should return cached data if available', async () => {
            const cachedData = {
                oauth_token: 'cached_token',
                oauth_token_secret: 'cached_secret'
            };
            redisClient.get.mockResolvedValue(cachedData);

            const result = await oauthServices.getRequestToken(
                requestTokenKeyGenerator,
                requestTokenTtl,
                redisClient
            );
            expect(result).toEqual(cachedData);
            expect(redisClient.get).toHaveBeenCalledWith('oauth:getRequestToken');
        });

        it('should request new token if no cached data', async () => {
            redisClient.get.mockResolvedValue(null);
            const responseData = 'oauth_token=new_token&oauth_token_secret=new_secret';
            axios.post.mockResolvedValue({ data: responseData });

            const result = await oauthServices.getRequestToken(
                requestTokenKeyGenerator,
                requestTokenTtl,
                redisClient
            );

            expect(result).toEqual({ oauth_token: 'new_token', oauth_token_secret: 'new_secret' });
            expect(redisClient.set).toHaveBeenCalledWith('oauth:getRequestToken', { oauth_token: 'new_token', oauth_token_secret: 'new_secret' }, requestTokenTtl);
        });

        it('should throw error if request fails', async () => {
            redisClient.get.mockResolvedValue(null);
            const error = new Error('Failed to get request token');
            axios.post.mockRejectedValue(error);

            await expect(
                oauthServices.getRequestToken(
                    requestTokenKeyGenerator,
                    requestTokenTtl,
                    redisClient
                )
            ).rejects.toThrow(error);
        });

        it('should throw error if response does not contain token', async () => {
            redisClient.get.mockResolvedValue(null);
            axios.post.mockResolvedValue({ data: 'invalid_response' });

            await expect(
                oauthServices.getRequestToken(
                    requestTokenKeyGenerator,
                    requestTokenTtl,
                    redisClient
                )
            ).rejects.toThrow('Request token response not properly formatted');
        });

    });

    describe('getAccessToken', () => {
        it('should return cached data if available', async () => {
            const cachedData = {
                oauth_token: 'cached_token',
                encrypted_oauth_token_secret: oauthServices.encrypt('cached_secret'),
            };
            redisClient.get.mockResolvedValue(cachedData);

            const result = await oauthServices.getAccessToken('verifier', requestTokenData, accessTokenKeyGenerator, accessTokenTtl, redisClient);
            expect(result).toEqual(cachedData);
        });

        it('should request new access token if no cached data', async () => {
            const mockGet = redisClient.get.mockResolvedValue(null);
            const responseData = {
                oauth_token: 'new_token',
                oauth_token_secret: 'new_secret'
            };
            axios.post.mockResolvedValue({ data: responseData });

            const result = await oauthServices.getAccessToken(
                'verifier',
                requestTokenData,
                accessTokenKeyGenerator,
                accessTokenTtl,
                redisClient
            );
            expect(result.oauth_token).toEqual(responseData.oauth_token);
            expect(oauthServices.decrypt(result.encrypted_oauth_token_secret)).toEqual(responseData.oauth_token_secret);
            mockGet.mockRestore();
        });

        it('should throw error if verifier is missing', async () => {
            await expect(oauthServices.getAccessToken(undefined, requestTokenData, accessTokenKeyGenerator, accessTokenTtl, redisClient)).rejects.toThrow('Verifier is missing');
        });

        it('should throw error if request fails', async () => {
            redisClient.get.mockResolvedValue(null);
            const expectedErrorMessage = 'Failed to get request token';
            axios.post.mockRejectedValue(new Error(expectedErrorMessage));

            await expect(oauthServices.getAccessToken('verifier', requestTokenData, accessTokenKeyGenerator, accessTokenTtl, redisClient)).rejects.toThrow(expectedErrorMessage);
        });

        it('should throw error if response does not contain token', async () => {
            redisClient.get.mockResolvedValue(null);
            axios.post.mockResolvedValue({ data: 'invalid_response' });
            const badRequestTokenData = {
                'bad_token': '',
            };

            await expect(
                oauthServices.getAccessToken(
                    'verifier', badRequestTokenData, accessTokenKeyGenerator, accessTokenTtl, redisClient
                )
            ).rejects.toThrow('Failed to get access token');
        });

    });

    describe('Encryption and Decryption', () => {
        it('should encrypt and decrypt data', () => {
            const data = 'test_data';
            const encryptedData = oauthServices.encrypt(data);
            const decryptedData = oauthServices.decrypt(encryptedData);

            expect(decryptedData).toEqual(data);
        });
    });

    describe('getDecryptedAccessToken', () => {
        it('should return decrypted access token', async () => {
            const accessTokenData = {
                oauth_token: 'token',
                encrypted_oauth_token_secret: oauthServices.encrypt('secret'),
            };
            redisClient.get.mockResolvedValue(accessTokenData);

            const result = await oauthServices.getDecryptedAccessToken(accessTokenKeyGenerator() ,redisClient);

            expect(result.key).toEqual(accessTokenData.oauth_token);
            expect(result.secret).toEqual(oauthServices.decrypt(accessTokenData.encrypted_oauth_token_secret));
        });

        it('should throw error if access token is missing', async () => {
            redisClient.get.mockResolvedValue(null);

            await expect(
                oauthServices.getDecryptedAccessToken(
                    accessTokenKeyGenerator(),
                    redisClient
                )
            ).rejects.toThrow('OAuth tokens are not available or expired. Please authenticate first.');
        });
    });

});
