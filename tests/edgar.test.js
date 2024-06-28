import { get10k } from '../src/routes/edgar';

import axios from 'axios';
jest.mock('axios');


describe('EDGAR Service', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should handle error when getting 10-K filings', async () => {
        const errorMessage = 'Failed to fetch data';
        axios.get.mockRejectedValue(new Error(errorMessage));

        await expect(get10k('AAPL')).rejects.toThrow('Error fetching or parsing 10-K filings. Double-check the stock ticker.');
    });

    test('should handle empty response when getting 10-K filings', async () => {
        const xmlResponse = '<feed></feed>';
        axios.get.mockResolvedValue({ data: xmlResponse });

        await expect(get10k('AAPL')).rejects.toThrow('No 10-K filings found.');
    });

    test('should handle missing fields in the response when getting 10-K filings', async () => {
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

        const result = await get10k('AAPL');

        expect(result).toEqual([{
            title: '10-K 2023',
            url: 'https://example.com/10k',
            xbrl_url: 'https://example.com/xbrl',
            filingDate: undefined
        }]);
    });

    test('should handle multiple entries in the response when getting 10-K filings', async () => {
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

        const result = await get10k('AAPL');

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

    test('should get 10-K filings', async () => {
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

        const result = await get10k('AAPL');

        expect(result).toEqual([{
            title: '10-K 2023',
            url: 'https://example.com/10k',
            xbrl_url: 'https://example.com/xbrl',
            filingDate: '2023-03-01'
        }]);
    });
});
