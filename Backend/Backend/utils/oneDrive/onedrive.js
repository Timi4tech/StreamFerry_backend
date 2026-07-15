// token.js
const axios = require('axios');
const querystring = require('querystring');
require('dotenv').config();

const {
  generateCodeVerifier,
  generateCodeChallenge,
} = require('./pkce');

function getAuthUrl(req) {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  // 🔐 Store verifier per user/session
  req.session.pkceVerifier = codeVerifier;

  const params = querystring.stringify({
    client_id: process.env.MICROSOFT_CLIENT_ID,
    response_type: 'code',
    redirect_uri: process.env.MICROSOFT_URL_REDIRECT,
    response_mode: 'query',
    scope: 'openid profile offline_access Files.ReadWrite',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state: '12345',
  });

  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`;
}

async function getOneDriveAccessToken(code, codeVerifier) {
  const url = `https://login.microsoftonline.com/common/oauth2/v2.0/token`;

  const data = querystring.stringify({
    client_id: process.env.MICROSOFT_CLIENT_ID,
    client_secret: process.env.MICROSOFT_CLIENT_SECRET,
    code,
    redirect_uri: process.env.MICROSOFT_URL_REDIRECT,
    grant_type: 'authorization_code',
    code_verifier: codeVerifier, // 🔥 REQUIRED
  });

  const response = await axios.post(url, data, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  return response.data;
}

module.exports = {getOneDriveAccessToken, getAuthUrl};
