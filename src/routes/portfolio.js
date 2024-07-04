import axios from 'axios';
import { oauth } from '../services/oauth.js';
import withCache, { RedisClientHandler } from '../services/redis.js';
import { etradeBaseUrl } from '../services/utils.js';
import { getStock } from './stock.js';


async function getAccountPortfolio(accountIdKey, accessToken, accessTokenSecret) {
    const requestData = {
        url: `${etradeBaseUrl}/v1/accounts/${accountIdKey}/portfolio`,
        method: 'GET',
    };
    const token = { key: accessToken, secret: accessTokenSecret };
    const headers = oauth.toHeader(oauth.authorize(requestData, token));

    try {
        const response = await axios.get(requestData.url, { headers });
        return response.data;
    } catch (error) {
        throw new Error('Error fetching account portfolio.', error);
    };

}

const getPortfolioDataWithoutCache = async function (accountList, token) {

    if (!accountList) {
        throw new Error('No accounts found.');
    }
    try {
        const accountPortfolios = await Promise.all(
            accountList.map(async (account) => {
                const portfolio = await getAccountPortfolio(account.accountIdKey, token.key, token.secret);
                return {
                    accountId: account.accountIdKey,
                    accountName: account.accountName,
                    portfolio,
                };
            })
        );

        return accountPortfolios;
    } catch (error) {
        throw error;
    }
};

const getPortfolioData = (
    accountList,
    token,
    keyGenerator,
    ttl,
    redisClient
) => withCache(keyGenerator, ttl, redisClient)(getPortfolioDataWithoutCache)(accountList, token);

async function flattenPortfolioData(portfolios) {
    try {
        let all_positions = [];
        portfolios.reduce((result, portfolio) => {
            const { accountId, accountName, portfolio: portfolioData } = portfolio;
            portfolioData.PortfolioResponse.AccountPortfolio[0].Position.reduce((_, position) => {
                const existingPosition = all_positions.find(p => p.symbol === position.symbolDescription);
                if (existingPosition) {
                    existingPosition.accountIds.push(accountId);
                    existingPosition.accountNames.push(accountName);
                    existingPosition.quantity += position.quantity;
                    existingPosition.marketValue += position.marketValue;
                } else {
                    all_positions.push({
                        accountIds: [accountId],
                        accountNames: [accountName],
                        symbol: position.symbolDescription,
                        quantity: position.quantity,
                        price: position.Quick.lastTrade,
                        marketValue: position.marketValue,
                    });
                }
            }, []);
        }, []);
        all_positions.sort((a, b) => b.marketValue - a.marketValue);
        return all_positions;
    }
    catch (error) {
        throw new Error('Error flattening portfolio data.', error);
    }
}

async function enrichPortfolioData(flattenedPortfolioData, redisClient= new RedisClientHandler()) {
    try {
        const enrichedPortfolioData = await Promise.all(
            flattenedPortfolioData.map(async (position) => {
                console.log('position:', position);
                const stockData = await getStock(position.symbol, redisClient);
                return {
                    ...position,
                    stockData,
                };
            })
        );
        return enrichedPortfolioData;
    } catch (error) {
        throw new Error('Error enriching portfolio data.', error);
    }
}

export {
    getPortfolioData,
    flattenPortfolioData,
    enrichPortfolioData,
};
