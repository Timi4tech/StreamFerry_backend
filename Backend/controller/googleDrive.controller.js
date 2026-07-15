const streamQueue =  require('../queue/streamqueue')
const {env} = require("./env.config")
const logger = reqire("../logger/logger")
const redisClient = require('../config/redis.config');
const googleQueue  =  require('../queue/streamqueue')
const { ensureFreshAccessToken } = require('../utils/googleDrive/googleOAuth');
const { oAuth2Client } = require('../utils/googleDrive/googleOAuth');
const {validationSchema,zodErrorTree} =  require("../schemas/validation.schemas")



const startStream= async(req,res)=>{
  try{
   const userId = req.session.user.id
   const queryvalidation =  validationSchema.safeParse(req.body)
   if (queryvalidation.success){
    const validatedData =  queryvalidation.data
   await googleQueue.add(
    'startGoogleStream',{
       ZoomRecordings : validatedData.selectedZoomRecordings,
       Folder : validatedData.googleDriveFolder,
       Id : userId
    },
    { removeOnComplete: 1000, removeOnFail: 5000 }
   )
   logger.info(`${userId}'s ${selectedZoomRecordings} queued successsfully in google drive folder ${googleDriveFolder}`)
    res.json({status:'stream in progress'})
  }else{logger.warn(`stream submitted details invalid - ${queryvalidation.error}`,{
    errorType: "ValidationError",
    location: './controller/goolgeDrive.controller'
  })
   res.status(400).json({error:zodErrorTree(queryvalidation.error)})
  }
  }catch(error){
    logger.error(`User_${userId}'s ${selectedZoomRecordings} failed - ${error}`,{
      errorType: `OtherError`,
      location: './controller/goolgeDrive.controller'
    })
    res.status(500).json({message:"google drve stream failed"})

  }


}



 const googleAuth = async(req, res) => {
  try{
    const userId = req.session.user.id
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',     // gives refresh_token
    prompt: 'consent',          // forces refresh_token on first auth
    scope: [
      'https://www.googleapis.com/auth/drive',
    ],
  });
   const validateAuthUrl = validationSchema.safeParse(authUrl)
   if (validateAuthUrl.success){
      res.redirect(authUrl);
   }else{logger.warn(`User_${userId} authentication url failed - ${zodErrorTree(validateAuthUrl.error)}`)}
}catch(error){
    logger.error(`User_${userId}'s google authentication url  failed - ${error}`,{
      errorType: `OtherError`,
      location: './controller/goolgeDrive.controller'
    })
    res.status(500).json({error:`google authentication failed`})
}
}



const googleOAuth =  async (req, res) => {
 try{ const  code  = req.query.code

const { tokens } = await oAuth2Client.getToken(code);
oAuth2Client.setCredentials(tokens);


const accessToken= tokens.access_token;
const userId = req.session.user.id
await redisClient.set(`googledrive:accessToken:${userId}`,accessToken,{EX:60*60})

const url = `${env.FRONTEND_URL}/dashboard?googledriveauthsuccess=true`;
res.redirect(url);
}catch (error) {
  res.status(500).json({ error: error.message });
  logger.error(`User${userId} google callback failed -${error}`,{
    errorType: "OtherError",
    location: './controller/goolgeDrive.controller'
  })
} 
}

module.exports = {startStream,googleAuth,googleOAuth}