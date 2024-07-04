import axios from 'axios';
import { parseString as _parseString } from 'xml2js';
import { promisify } from 'util';
import withCache from '../services/redis.js';

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
        throw new Error('Error fetching or parsing 10-K filings. Double-check the stock ticker.', error);
    }
}

// function that fetches 10-K filings from SEC Edgar
const get10kWithoutCache = async function (ticker) {
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
};

// Wrap the function with caching logic
const get10k = (ticker, keyGenerator, ttl, redisClient) => withCache(keyGenerator, ttl, redisClient)(get10kWithoutCache)(ticker);

export {
    get10k,
};
