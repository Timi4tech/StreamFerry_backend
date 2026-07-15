// googleDriveFunctions.js

const axios = require('axios');
const logger = require('../../logger/logger');




async function googleDriveUploadSession({ file_name, folderId, size, accessToken, file_type }) {
  const mimeTypeMap = {
    'video': 'video/mp4',
    'audio': 'audio/m4a',
    'chat': 'text/plain',
    'transcript': 'text/vtt',
    'cc': 'text/vtt',
    'timeline': 'application/json',
  };
  try{
  const mimeType = mimeTypeMap[file_type?.toLowerCase()] ?? 'application/octet-stream';
  const metadata = {
    name: file_name,
    parents: [folderId],
  };

  const sessionRes = await axios.post(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable",
    metadata,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": mimeType,
        "X-Upload-Content-Length": size,
      },
    }
  );

  return sessionRes.headers.location;
}catch(error){
  logger.error(`google drive upload session failed - ${error}`)
}
}



module.exports = { googleDriveUploadSession };