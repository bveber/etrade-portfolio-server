import { getDecryptedAccessToken } from './oauth.js';
import { getAccountList } from './getAccountList.js';

// Oauth Request Token
export const requestTokenKeyGenerator = () => 'oauth:getRequestToken';
export const requestTokenTtl = 250;

// Oauth Access Token
export const accessTokenKeyGenerator = () => 'oauth:getAccessToken';
export const accessTokenTtl = 86400;

// getAccountList
export const getAccountListKeyGenerator = () => 'accountList';
export const getAccountListTtl = 3600;

// getAccountBalances
export const getAccountBalancesKeyGenerator = () => 'accountBalances';
export const getAccountBalancesTtl = 3600;

// edgar
export const edgarKeyGenerator = (ticker) => `edgar:${ticker}`;
export const edgarTtl = 3600;

// finnhubApi
export const finnhubApiKeyGenerator = (ticker) => `finnhubApi:${ticker}`;
export const finnhubApiTtl = 86400;

// getPortfolioData
export const getPortfolioDataKeyGenerator = () => 'portfolioData';
export const getPortfolioDataTtl = 3600;

// stocks
export const stocksKeyGenerator = (ticker) => `stocks:${ticker}`;
export const stocksTtl = 3600;

// transactions
export const transactionsKeyGenerator = () => 'transactions';
export const transactionsTtl = 3600;

// yahooFinance
export const yahooFinanceKeyGenerator = (ticker) => `yahooFinance:${ticker}`;
export const yahooFinanceTtl = 3600;

// etrade
export const etradeBaseUrl = 'https://api.etrade.com';

export async function getTokenAndAccountList(redisClient) {
    const token = await getDecryptedAccessToken(accessTokenKeyGenerator(), redisClient);
    return {
        token: token,
        accountList: await getAccountList(token, getAccountListKeyGenerator, getAccountListTtl, redisClient),
    };
}

