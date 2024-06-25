import axios from 'axios';
import { getAccountList } from '../services/getAccountList.js';
import { oauth, baseUrl } from '../services/oauth.js';
import cache from '../services/cache.js';
import handleCustomError from '../services/utils.js';

async function getAccountPortfolio(accountIdKey) {
    const requestData = {
        url: `${baseUrl}/v1/accounts/${accountIdKey}/portfolio`,
        method: 'GET',
    };

    const token = { key: cache.accessToken, secret: cache.accessTokenSecret };
    const headers = oauth.toHeader(oauth.authorize(requestData, token));

    try {
        const response = await axios.get(requestData.url, { headers });
        return response.data;
    } catch (error) {
        handleCustomError(error);
    }
}

async function getPortfolioData() {
    if (!cache.accessToken || !cache.accessTokenSecret || Date.now() > cache.accessTokenExpiryTime) {
        throw new Error('OAuth tokens are not available or expired. Please authenticate first.');
    }

    try {
        const accountList = await getAccountList();
        if (!accountList) {
            throw new Error('No accounts found.');
        }

        const accountPortfolios = await Promise.all(
            accountList.map(async (account) => {
                const portfolio = await getAccountPortfolio(account.accountIdKey);
                return {
                    accountId: account.accountIdKey,
                    accountName: account.accountName,
                    portfolio,
                };
            })
        );

        return accountPortfolios;
    } catch (error) {
        handleCustomError(error);
    }
}

async function flattenPortfolioData(portfolios) {
    try {
        let all_positions = [];
        const flattenedPortfolio = portfolios.reduce((result, portfolio) => {
            const { accountId, accountName, portfolio: portfolioData } = portfolio;
            const flattenedPositions = portfolioData.PortfolioResponse.AccountPortfolio[0].Position.reduce((positions, position) => {
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
        handleCustomError(error);
    }
}

export {
    getPortfolioData,
    flattenPortfolioData,
};
