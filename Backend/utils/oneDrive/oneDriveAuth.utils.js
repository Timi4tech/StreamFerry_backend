const { ConfidentialClientApplication } = require ("@azure/msal-node")
const redisClient = require('../../config/redis.config.js');
const {env} = require("./env.config")
const logger = reqire("../logger/logger")


const msalClient = async()=>{
  
  try{
  const newmsalClient = new ConfidentialClientApplication({
  auth: {
    clientId: env.MICROSOFT_CLIENT_ID,
    authority: `https://login.microsoftonline.com/common`,
    clientSecret: env.MICROSOFT_CLIENT_SECRET,
  },
});
 return newmsalClient
}catch(error){
  logger.error(`microsoft azure client connection failed- ${error}`,{
    errorType: "OtherError",
    location:"./utils/oneDriveAuth.utils"
  })
}
}

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
    logger.error(`Silent refresh failed - ${err}`,{
      errorType: "OtherError",
      location: "./utils/oneDriveAuth.utils"
    });

    // 4️⃣ Refresh failed → force re-auth
    return res.redirect("/onedriveauthurl");
  }
}




module.exports = { msalClient, ensureOneDriveAccessToken };