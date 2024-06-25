import { getRequestToken, getAccessToken } from '../src/services/oauth';
import cache from '../src/services/cache';

import axios from 'axios';
jest.mock('axios');

describe('OAuth Service', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should throw error if getAccessToken response is missing oauth_token_secret', async () => {
        axios.post.mockResolvedValue({ data: 'oauth_token=token' });

        await expect(getAccessToken('requestToken', 'requestTokenSecret', 'verifier')).rejects.toThrow('Failed to get access token');
    });

    test('should throw error if getAccessToken response is missing oauth_token', async () => {
        axios.post.mockResolvedValue({ data: 'oauth_token_secret=secret' });

        await expect(getAccessToken('requestToken', 'requestTokenSecret', 'verifier')).rejects.toThrow('Failed to get access token');
    });

    test('should throw error if getRequestToken response is missing oauth_token_secret', async () => {
        axios.post.mockResolvedValue({ data: 'oauth_token=token' });

        await expect(getRequestToken()).rejects.toThrow('Failed to get request token');
    });

    test('should throw error if requestToken is missing', async () => {
        await expect(getAccessToken(null, 'requestTokenSecret', 'verifier')).rejects.toThrow('Request token is missing');
    });

    test('should throw error if requestTokenSecret is missing', async () => {
        await expect(getAccessToken('requestToken', null, 'verifier')).rejects.toThrow('Request token secret is missing');
    });

    test('should throw error if verifier is missing', async () => {
        await expect(getAccessToken('requestToken', 'requestTokenSecret', null)).rejects.toThrow('Verifier is missing');
    });

    test('should throw error if getRequestToken API call fails', async () => {
        axios.post.mockRejectedValue(new Error('Failed to get request token'));

        await expect(getRequestToken()).rejects.toThrow('Failed to get request token');
    });

    test('should throw error if getAccessToken API call fails', async () => {
        axios.post.mockRejectedValue(new Error('Failed to get access token'));

        await expect(getAccessToken('requestToken', 'requestTokenSecret', 'verifier')).rejects.toThrow('Failed to get access token');
    });

    test('should throw error if getRequestToken response is missing oauth_token', async () => {
        axios.post.mockResolvedValue({ data: 'oauth_token_secret=secret' });

        await expect(getRequestToken()).rejects.toThrow('Failed to get request token');
    });

    test('should get request token and cache it', async () => {
        axios.post.mockResolvedValue({ data: 'oauth_token=token&oauth_token_secret=secret' });

        const result = await getRequestToken();

        expect(result).toEqual({ oauth_token: 'token', oauth_token_secret: 'secret' });
        expect(cache.requestToken).toBe('token');
        expect(cache.requestTokenSecret).toBe('secret');
    });

    test('should get access token and cache it', async () => {
        axios.post.mockResolvedValue({ data: 'oauth_token=token&oauth_token_secret=secret' });

        const result = await getAccessToken('requestToken', 'requestTokenSecret', 'verifier');

        expect(result).toEqual({ oauth_token: 'token', oauth_token_secret: 'secret' });
        expect(cache.accessToken).toBe('token');
        expect(cache.accessTokenSecret).toBe('secret');
    });

    test('should use cached request token if available', async () => {
        cache.requestToken = 'cachedToken';
        cache.requestTokenSecret = 'cachedSecret';

        const result = await getRequestToken();

        expect(result).toEqual({ oauth_token: 'cachedToken', oauth_token_secret: 'cachedSecret' });
        expect(axios.post).not.toHaveBeenCalled();
    });

    test('should use cached access token if available', async () => {
        cache.accessToken = 'cachedToken';
        cache.accessTokenSecret = 'cachedSecret';

        const result = await getAccessToken('requestToken', 'requestTokenSecret', 'verifier');

        expect(result).toEqual({ oauth_token: 'cachedToken', oauth_token_secret: 'cachedSecret' });
        expect(axios.post).not.toHaveBeenCalled();
    });

});
