
const dotenv = require('dotenv');
dotenv.config();

const settings = {
  clientId: process.env.MICROSOFT_CLIENT_ID,
  tenantId: 'common',
  graphUserScopes: ['user.read',  'Files.ReadWrite.Selected'],
};

module.exports = settings;