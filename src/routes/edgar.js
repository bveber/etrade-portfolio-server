const axios = require('axios');
const xml2js = require('xml2js');
const { promisify } = require('util');

const parseString = promisify(xml2js.parseString);

async function get10k(ticker) {
    console.log('Fetching 10-K filing data for:', ticker);
    const queryUrl = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${ticker}&type=10-K&dateb=&owner=include&count=10&output=atom`;

    try {
        const response = await axios.get(queryUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            },
        });

        const result = await parseString(response.data, { explicitArray: false });

        if (!result.feed || !result.feed.entry) {
            throw new Error('No 10-K filings found.');
        }

        const entries = Array.isArray(result.feed.entry) ? result.feed.entry : [result.feed.entry];
        const filings = entries.map(entry => ({
            title: entry.title,
            url: entry.link.$.href,
            xbrl_url: entry.content.xbrl_href,
            filingDate: entry.updated,
        }));

        return filings;
    } catch (error) {
        console.error('Error fetching or parsing 10-K filings:', error.message);
        throw new Error('Error fetching or parsing 10-K filings. Double-check the stock ticker.');
    }
}

module.exports = {
    get10k,
};
