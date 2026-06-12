const { ConfidentialClientApplication } = require ("@azure/msal-node")
const redisClient = require('../../worker/redis.js');
const dotenv = require('dotenv');
dotenv.config();
const msalClient = new ConfidentialClientApplication({
  auth: {
    clientId: process.env.MICROSOFT_CLIENT_ID,
    authority: `https://login.microsoftonline.com/common`,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
  },
});

 async function ensureOneDriveAccessToken(req,res) {
    const id =  req.session.user.id
    const  accessToken =  await redisClient.get(`oneDrive:accessToken:${id}`)
     const accountId = await redisClient.get(`oneDrive:accountid:${id}`) 
    

  // 3️⃣ Token expired → try silent refresh
  try {
      if (!accessToken) {
    const tokenResponse = await msalClient.acquireTokenSilent({
      account: accountId,
     scopes: ["User.Read", "Files.ReadWrite","Files.Read", "offline_access"],
    });
    accessToken = tokenResponse.accessToken
   accountId = tokenResponse.account
    // Update session
 await redisClient.set(`oneDrive:accessToken:${id}`, accessToken,{EX: 60 * 60})
 await redisClient.set(`oneDrive:accountid:${id}`, accountId ,{EX: 60 * 60})
}

return(accessToken)
  } catch (err) {
    console.warn("Silent refresh failed", err.message);

    // 4️⃣ Refresh failed → force re-auth
    return res.redirect("/onedriveauthurl");
  }
}




module.exports = { msalClient, ensureOneDriveAccessToken };