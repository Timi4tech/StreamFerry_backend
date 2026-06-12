const streamQueue =  require('../queue/streamqueue')
const dotenv = require('dotenv');
const redisClient = require('../worker/redis');
dotenv.config();
const googleQueue  =  require('../queue/streamqueue')
const { ensureFreshAccessToken } = require('../utils/googleDrive/googleOAuth');
const { oAuth2Client } = require('../utils/googleDrive/googleOAuth');
//const { ensureZoomAccessToken } = require('../middleware/zoom/zoomAuth');




const startStream= async(req,res)=>{
  try{
   const  { selectedZoomRecordings, googleDriveFolder} = req.body
   const userId = req.session.user.id
   await googleQueue.add(
    'startGoogleStream',{
       ZoomRecordings : selectedZoomRecordings,
       Folder : googleDriveFolder,
       Id : userId
    },
    { removeOnComplete: 1000, removeOnFail: 5000 }
   )
   
    res.json({status:'stream in progress'})
  }catch(error){
    res.status(500).json({error:error.message})
  }


}
// connect google drive
 const connectGoogleDrive= async (req, res) => {
  try {
     const token = await ensureFreshAccessToken()
    return res.json({
      accessToken: token, status: "success"
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};



 const googleAuth = async(req, res) => {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',     // gives refresh_token
    prompt: 'consent',          // forces refresh_token on first auth
    scope: [
      'https://www.googleapis.com/auth/drive',
    ],
  });
  res.redirect(authUrl);
}



const googleOAuth =  async (req, res) => {
 try{ const  code  = req.query.code

const { tokens } = await oAuth2Client.getToken(code);
oAuth2Client.setCredentials(tokens);


const accessToken= tokens.access_token;
const userId = req.session.user.id
await redisClient.set(`googledrive:accessToken:${userId}`,accessToken,{EX:60*60})

const url = `${process.env.FRONTEND_URL}/dashboard?googledriveauthsuccess=true`;
res.redirect(url);
}catch (error) {
  res.status(500).json({ error: error.message });
} 
}

module.exports = {startStream,connectGoogleDrive,googleAuth,googleOAuth}