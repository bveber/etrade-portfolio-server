import { get10k } from '../src/routes/edgar';
import { edgarKeyGenerator, edgarTtl } from '../src/services/utils';

import axios from 'axios';
jest.mock('axios');


describe('EDGAR Service', () => {
    let redisClient;

    beforeEach(() => {
        redisClient = {
            get: jest.fn(),
            set: jest.fn(),
            quit: jest.fn(),
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should handle error when getting 10-K filings', async () => {
        const errorMessage = 'Failed to fetch data';
        axios.get.mockRejectedValue(new Error(errorMessage));
        const ticker = 'AAPL';

        await expect(get10k(ticker, edgarKeyGenerator, edgarTtl, redisClient)).rejects.toThrow('Error fetching or parsing 10-K filings. Double-check the stock ticker.');
    });

    it('should handle empty response when getting 10-K filings', async () => {
        const ticker = 'AAPL';
        const xmlResponse = '<feed></feed>';
        axios.get.mockResolvedValue({ data: xmlResponse });

        await expect(get10k(ticker, edgarKeyGenerator, edgarTtl, redisClient)).rejects.toThrow('No 10-K filings found.');
    });

    it('should handle missing fields in the response when getting 10-K filings', async () => {
        const ticker = 'AAPL';
        const xmlResponse = `<feed>
            <entry>
                <title>10-K 2023</title>
                <link href="https://example.com/10k" />
                <content>
                    <xbrl_href>https://example.com/xbrl</xbrl_href>
                </content>
            </entry>
        </feed>`;
        axios.get.mockResolvedValue({ data: xmlResponse });

        const result = await get10k(ticker, edgarKeyGenerator, edgarTtl, redisClient);

        expect(result).toEqual([{
            title: '10-K 2023',
            url: 'https://example.com/10k',
            xbrl_url: 'https://example.com/xbrl',
            filingDate: undefined
        }]);
    });

    it('should handle multiple entries in the response when getting 10-K filings', async () => {
        const ticker = 'AAPL';
        const xmlResponse = `<feed>
            <entry>
                <title>10-K 2023</title>
                <link href="https://example.com/10k" />
                <content>
                    <xbrl_href>https://example.com/xbrl</xbrl_href>
                </content>
                <updated>2023-03-01</updated>
            </entry>
            <entry>
                <title>10-K 2022</title>
                <link href="https://example.com/10k-2022" />
                <content>
                    <xbrl_href>https://example.com/xbrl-2022</xbrl_href>
                </content>
                <updated>2022-02-28</updated>
            </entry>
        </feed>`;
        axios.get.mockResolvedValue({ data: xmlResponse });

        const result = await get10k(ticker, edgarKeyGenerator, edgarTtl, redisClient);

        expect(result).toEqual([
            {
                title: '10-K 2023',
                url: 'https://example.com/10k',
                xbrl_url: 'https://example.com/xbrl',
                filingDate: '2023-03-01'
            },
            {
                title: '10-K 2022',
                url: 'https://example.com/10k-2022',
                xbrl_url: 'https://example.com/xbrl-2022',
                filingDate: '2022-02-28'
            }
        ]);
    });

    it('should get 10-K filings', async () => {
        const ticker = 'AAPL';
        const xmlResponse = `<feed>
            <entry>
                <title>10-K 2023</title>
                <link href="https://example.com/10k" />
                <content>
                    <xbrl_href>https://example.com/xbrl</xbrl_href>
                </content>
                <updated>2023-03-01</updated>
            </entry>
        </feed>`;
        axios.get.mockResolvedValue({ data: xmlResponse });

        const result = await get10k(ticker, edgarKeyGenerator, edgarTtl, redisClient);

        expect(result).toEqual([{
            title: '10-K 2023',
            url: 'https://example.com/10k',
            xbrl_url: 'https://example.com/xbrl',
            filingDate: '2023-03-01'
        }]);
    });

});
