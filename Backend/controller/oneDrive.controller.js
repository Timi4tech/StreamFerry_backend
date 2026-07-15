const {validationSchema,zodErrorTree} =  require("../schemas/validation.schemas")
const {env} = require("./env.config")
const logger = reqire("../logger/logger")
const {createUploadSessionByFolderId} = require("../utils/oneDrive/oneDriveFunc");
const redisClient = require('../worker/redis');
const {fetchFolders}= require('../utils/oneDrive/oneDriveFunc')
const { ensureOneDriveAccessToken } = require('../utils/oneDrive/oneDriveAuth.utils');
const streamQueue =  require('../queue/streamqueue')
const {msalClient} = require('../utils/oneDrive/oneDriveAuth.utils')
const settings = require('../utils/oneDrive/oneDriveSettings');
const { ensureZoomAccessToken } = require('../utils/zoom/zoomAuth');
const { timeStamp } = require('console');
 


//fetch onedrive folders
const getOneDriveFolders = async(req,res)=>{
  const userId = req.session.user._id
  try{
 
 const accessToken = await ensureOneDriveAccessToken(req,res)
   const folders = await fetchFolders(accessToken,folderId = "root")
   res.json({folder:folders})
  }catch(error){
     logger.error(`User_${userId} fetch Onedrive folder failed - ${error}`,{
      errorType:"OtherError",
      location:"./controller/oneDrive.controller"
     })
  }
}






const startOneDriveStream =  async (req, res) => {

  const userId = req.session.user.id;
  try {
    const validateQuery =  validationSchema.safeParse(req.body)
    if (validateQuery.success){
      const validatedQuery = validateQuery.data
    const {accessToken} = await ensureZoomAccessToken(userId);

    const oneDriveToken = await ensureOneDriveAccessToken(req,res)
    await streamQueue.add(
       "startOneDriveStream",
  { Folder: validatedQuery.oneDriveFolder,
    Token:accessToken,
    ZoomRecordings: validateQuery.selectedZoomRecordings,
    DriveToken:oneDriveToken ,
     timeStamp: Date.now()
   },
  { removeOnComplete: validationSchema.removeOnComplete, removeOnFail: validationSchema.removeOnFail }
    )
    logger.info(`User_${userId}start onedrive stream queued successfully`)
   res.status(201).json({ status: 'stream in progress' });
  }else{
     logger.warn(`User_${userId} input validation error -${zodErrorTree(validateQuery.error),{
      errorType: "validationError",
      location:"./controller/oneDrive.controller"
     }} `)

     res.status(400).json({error: zodErrorTree(validateQuery.error)})
  }
  }catch (error) {
        logger.warn(`User_${userId} start onedrive stream failed -${error},{
      errorType: "validationError",
      location:"./controller/oneDrive.controller"
     }} `)
    res.status(500).json({ error: error });
  }
}


const oneDriveAuthUrl = async (req, res) => {
  const userId =  req.session.user._id
   try{  const authUrl = await msalClient.getAuthCodeUrl({
    scopes: ["User.Read", "Files.ReadWrite.All", "offline_access"], // per-user scopes
    redirectUri: env.MICROSOFT_URL_REDIRECT,
    settings,
    prompt: "consent",
  });
    const validateAuthUrl  =  validationSchema.safeParse(authUrl)
    if(validateAuthUrl.success){
      const validatedAuthUrl =  validateAuthUrl.data
      res.redirect(validatedAuthUrl.authUrl);
    }else{
      logger.warn(`User_${userId} oneDrive authentication Url validation failed -  ${zodErrorTree(validateAuthUrl.error)}`,{
        errorType: "ValidationError",
        location: "./controller/oneDrive.controller"
      })
      res.status(400).json({error: zodErrorTreez(validateAuthUrl.error)})
    }
}catch(error){
 logger.error(`User_${userId} Onedrive authentication failed - ${error}`,{
  errorType:"OtherError",
  location:"./controller/oneDrive.controller"
 })
 res.status(500).json({error:'oneDrive authentication failed '})
}
};

const oneDriveAuth =  async (req, res) => {
  const id =  req.session.user.id
 try{if (req.query.error) {
  console.warn("Microsoft auth denied:", req.query.error);

    // Optional: log description
   console.warn(req.query.error_description);

    return res.redirect(
      `/auth/failed?reason=${encodeURIComponent(req.query.error)}`
   );
  }

const tokenResponse = await msalClient.acquireTokenByCode({
    code: req.query.code,
    scopes: ["User.Read", "Files.ReadWrite.Selected"],
    redirectUri: env.MICROSOFT_URL_REDIRECT,
  });

 
   const accessToken = tokenResponse.accessToken
   const account =  tokenResponse.account
  await redisClient.set(`oneDrive:accessToken:${id}`, accessToken, {EX: 60 * 60});
  await redisClient.set(`oneDrive:accountid:${id}`, JSON.stringify(account),{EX:15 * 24 * 60 * 60})
  res.redirect(`${env.FRONTEND_URL}/dashboard?onedriveauthsuccess=true`);
}catch(error){
  logger.error(`User_${id} callback redirect failed - ${error}`,{
    errorType:'OtherError',
    location: "./controller/oneDrive.controller"
  })
}};


const createUploadSession =  async(req,res)=>{
  
     const userId = req.session.user._id
try{
   const accessToken = await ensureOneDriveAccessToken(req,res)
    const validateQuery = validationSchema.safeParse(req.body)
    if (validateQuery.success && accessToken){
     const validatedQuery =  validateQuery.data

    const uploadUrl = await createUploadSessionByFolderId(
      accessToken,
      validatedQuery.driveId,
      validatedQuery.folderId,
      validatedQuery.fileName
    );

     return uploadUrl
  }else if (validateQuery.success && !accessToken){
    logger.error(`User_${userId} Onedrive access token is invalid`,{
      errorType:"OtherError",
      location:"./controller/oneDrive.controller"

    })
    res.status(500).json({error:'onedrive authentication failed, please reconnect onedrive'})
  }else if(validateQuery.error && accessToken){
    logger.warn(`User_${userId} onedrive Upload session inputs validation failed- ${zodErrorTree(validateQuery)}`, {
      errorType:'ValidationError',
      location:"./controller/oneDrive.controller" 
    })
    res.status(400).json({error:zodErrorTree(validateQuery.error)})
  }else{
    res.status(500).json({error:'onedrive authentication failed, please reconnect onedrive'})
  }
}catch(err){
   logger.error(`User_${userId} onedrive upload session failed - ${error}`,{
    errorType:"OtherError",
    location: "./controller/oneDrive.controller"
   })
    res.status(500).json({error:'Onedrive Upload Session Failed'})
}
      
}

module.exports = {getOneDriveFolders,startOneDriveStream,
    oneDriveAuthUrl,oneDriveAuth,createUploadSession}