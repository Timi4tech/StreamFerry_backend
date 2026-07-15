
const {env} = require("./env.config")
const ensureCurrentUser = require('../middleware/userAuthentication')
const {validationSchema,zodErrorTree} =  require("../schemas/validation.schemas")
const { ensureZoomAccessToken } = require('../utils/zoom/zoomAuth');
const { fetchZoomRecordings } = require('../utils/zoom/zoomApi');
const { getZoomAuthUrl, zoomCallback } = require('../utils/zoom/zoomAuth');



const getzoomAccesstoken =  async(req,res)=>{
  try{
  const accessToken = await ensureZoomAccessToken(req,res)
  return accessToken
  }catch(error){
    logger.error(`get zoom access token failed`,{
      errorType:"OtherError",
      location: "./controller/zoom.controller"
    })
  }
}


const fetchZoomRecordings = async (req, res) => {
   const userId =  req.session.user._id
  try {
        const accessToken =  await ensureZoomAccessToken(req,res)
const recordings = await fetchZoomRecordings(accessToken);

  const allFiles = [];
  for (const recording of recordings) {
    
    for (const file of recording.recording_files || []) {
      let fileType ;
       if (file.file_type === 'MP4' || file.file_type === 'M4A') {
          // Set file variables
          fileType = file.file_type === 'MP4' ? 'video' : 'audio';}
      allFiles.push({
        id: file.id,
        meeting_id: file.meeting_id,
        recording_start: file.recording_start,
        recording_end: file.recording_end,
        file_type: fileType,
        file_size: file.file_size,
        download_url: file.download_url,
        file_name: `${recording.topic} - ${file.file_type.toUpperCase()} - ${new Date(recording.start_time).toISOString().split('T')[0]}`
      });
    }
  }

  res.json({ status: "success", files: allFiles});
  }catch (error) {
    logger.error(`User_${userId} fetch recordings failed - ${error}`,{
      errorType: "OtherError",
      location: "./controller/zoom.controller"
    })
    res.status(500).json({ error: error });
  }
}

const zoomAuthurl =  async (req, res) => {
  const authUrl = getZoomAuthUrl();
  res.redirect(authUrl);
}

const getZoomCallBack =  async (req, res) => {
 await zoomCallback(req, res);
};

module.exports = {getzoomAccesstoken,fetchZoomRecordings,
  zoomAuthurl,getZoomCallBack}