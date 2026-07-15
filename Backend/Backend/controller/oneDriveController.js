
const dotenv = require('dotenv');
dotenv.config();
const {createUploadSessionByFolderId} = require("../utils/oneDrive/oneDriveFunc");
const redisClient = require('../worker/redis');
const {fetchFolders}= require('../utils/oneDrive/oneDriveFunc')
const { ensureOneDriveAccessToken } = require('../utils/oneDrive/oneDriveAuth');
const streamQueue =  require('../queue/streamqueue')
const {msalClient} = require('../utils/oneDrive/oneDriveAuth')
const settings = require('../utils/oneDrive/oneDriveSettings');
const { ensureZoomAccessToken } = require('../utils/zoom/zoomAuth');
const { timeStamp } = require('console');
 


//fetch onedrive folders
const getOneDriveFolders = async(req,res)=>{
 const accessToken = await ensureOneDriveAccessToken(req,res)
   const folders = await fetchFolders(accessToken,folderId = "root")
   res.json({folder:folders})
}

// connect onedrive
 const connectOneDrive =  async(req, res) => {
   try {
      const accessToken = ensureOneDriveAccessToken(req,res)
        res.json({ accessToken: accessToken, success: true });
   }catch (error) {
    res.status(500).json({ error: error.message });

 }}



const startOneDriveStream =  async (req, res) => {
  try {
    const {selectedZoomRecordings,oneDriveFolder } = req.body;
    const userId = req.session.user.id;
    const {accessToken} = await ensureZoomAccessToken(userId);
    // const sessionData = await redisClient.get(`oneDrive:accessToken:${userId}+`);
    //const parsedData = JSON.parse(sessionData);
    const oneDriveToken = await ensureOneDriveAccessToken(req,res)
    //await ensureOneDriveAccessToken(parsedData ,userId);
    await streamQueue.add(
       "startOneDriveStream",
  { Folder: oneDriveFolder,
    Token:accessToken,
    ZoomRecordings: selectedZoomRecordings,
    DriveToken:oneDriveToken ,
     timeStamp: Date.now()
   },
  { removeOnComplete: 1000, removeOnFail: 5000 }
    )
   res.status(201).json({ status: 'stream in progress' });
  }catch (error) {
    res.status(500).json({ error: error.message });
  }
}


const oneDriveAuthUrl = async (req, res) => {
    const authUrl = await msalClient.getAuthCodeUrl({
    scopes: ["User.Read", "Files.ReadWrite.All", "offline_access"], // per-user scopes
    redirectUri: process.env.MICROSOFT_URL_REDIRECT,
    settings,
    prompt: "consent",
  });
  res.redirect(authUrl);
};

const oneDriveAuth =  async (req, res) => {
 if (req.query.error) {
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
    redirectUri: process.env.MICROSOFT_URL_REDIRECT,
  });

 
   const id =  req.session.user.id
   const accessToken = tokenResponse.accessToken
   const account =  tokenResponse.account
  await redisClient.set(`oneDrive:accessToken:${id}`, accessToken, {EX: 60 * 60});
  await redisClient.set(`oneDrive:accountid:${id}`, JSON.stringify(account),{EX:15 * 24 * 60 * 60})
  res.redirect(`${process.env.FRONTEND_URL}/dashboard?onedriveauthsuccess=true`);
};


const createUploadSession =  async(req,res)=>{
    const{driveId,folderId,fileName} =  req.body
    const accessToken = await ensureOneDriveAccessToken(req,res)
     
try{
    const uploadUrl = await createUploadSessionByFolderId({
      accessToken,
      driveId,
      folderId,
      fileName
    });

    res.json(uploadUrl)
    console.log(uploadurl)
}catch(err){
    res.json({error: err})
}
      
}

module.exports = {getOneDriveFolders,connectOneDrive,startOneDriveStream,
    oneDriveAuthUrl,oneDriveAuth,createUploadSession}