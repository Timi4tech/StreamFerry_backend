const axios = require ( "axios");
const { ensureZoomAccessToken } = require("../zoom/zoomAuth");
const redisClient = require('../../worker/redis')
async function fetchFolders(accessToken, folderId = "root") {
  const endpoint =
    folderId === "root"
      ? `https://graph.microsoft.com/v1.0/me/drive/root/children`
      : `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}/children`;

  const res = await axios.get(endpoint, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  return res.data.value
    .filter(item => item.folder)
    .map(folder => ({
      folderId: folder.id,
      folderName: folder.name,
      driveId: folder.parentReference.driveId
    }));
}



async function createUploadSessionByFolderId({
  oneDriveToken,
  driveId,
  folderId,
  fileName,
}) {
  try {

    const url = `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${folderId}:/${encodeURIComponent(fileName)}:/createUploadSession`;

    const res = await axios.post(
      url,
      {
        item: {
          "@microsoft.graph.conflictBehavior": "replace"
        }
      },
      {
        headers: {
          Authorization: `Bearer ${oneDriveToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    return res.data.uploadUrl;

  } catch (error) {
    console.error(
      "❌ Failed to create OneDrive upload session:",
      error.response?.data || error.message
    );
    throw error;
  }
}
 





async function oneDriveupload({ uploadUrl, stream, size, fileId}) {
try{
  let offset = 0;

  for await (const chunk of stream) {

    const start = offset;
    const end = offset + chunk.length - 1;

    const contentRange = `bytes ${start}-${end}/${size}`;

    const res = await axios.put(uploadUrl, chunk, {
      headers: {
        "Content-Length": chunk.length,
        "Content-Range": contentRange,
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: 0
    });

    offset += chunk.length;

    console.log(`Uploaded ${offset}/${size}`);
    
    // When upload finishes Graph returns file metadata
    if (res.status === 201 || res.status === 200) {
      console.log("✅ Upload completed");
      return res.data;
    }
     await redisClient.set(`oneDrive:uploadoffset:${fileId}`,offset)
  }
}catch(err){
  console.log(err,offset)
  
}
}

module.exports = { oneDriveupload, createUploadSessionByFolderId, fetchFolders };