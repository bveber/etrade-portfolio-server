const { getRequestToken, getAccessToken } = require('../src/services/oauth');
const cache = require('../src/services/cache');

jest.mock('axios');
const axios = require('axios');

describe('OAuth Service', () => {
    afterEach(() => {
        jest.clearAllMocks();
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
});
