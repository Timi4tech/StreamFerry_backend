
const dotenv = require('dotenv');
dotenv.config();
const ensureCurrentUser = require('../middleware/userAuthentication')

const { ensureZoomAccessToken } = require('../utils/zoom/zoomAuth');
const { fetchZoomRecordings } = require('../utils/zoom/zoomApi');
const { getZoomAuthUrl, zoomCallback } = require('../utils/zoom/zoomAuth');





const getzoomAccesstoken =  async(req,res)=>{
  const accessToken = await ensureZoomAccessToken(req,res)
  res.json(accessToken)
}


const fetchZoomRecordings = async (req, res) => {
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

  // ✅ Send ONE response
  res.json({ status: "success", files: allFiles});
  }catch (error) {
    res.status(500).json({ error: error.message });
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