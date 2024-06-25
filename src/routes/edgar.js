import axios from 'axios';
import { parseString as _parseString } from 'xml2js';
import { promisify } from 'util';

const parseString = promisify(_parseString);

// function that fetches data from URL with custom error handling
async function fetchData(queryUrl) {
    try {
        const response = await axios.get(queryUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching or parsing 10-K filings:', error.message);
        throw new Error('Error fetching or parsing 10-K filings. Double-check the stock ticker.');
    }
}

// function that fetches 10-K filings from SEC Edgar
async function get10k(ticker) {
    console.log('Fetching 10-K filing data for:', ticker);
    const queryUrl = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${ticker}&type=10-K&dateb=&owner=include&count=10&output=atom`;
    const response = await fetchData(queryUrl);

    const result = await parseString(response, { explicitArray: false });

    // Check if response contains 10-K filings
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
}

export {
    get10k,
};
