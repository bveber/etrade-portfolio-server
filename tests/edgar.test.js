import { get10k } from '../src/routes/edgar';

import axios from 'axios';
jest.mock('axios');


describe('EDGAR Service', () => {
    afterEach(() => {
        jest.clearAllMocks();
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
