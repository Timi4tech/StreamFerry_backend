const { downloadFromZoom, cleanupTempFile,getZoomStream } = require("./zoom/zoomApi");
const { oneDriveupload, createUploadSessionByFolderId } = require("./oneDrive/oneDriveFunc");
const { getSyncedRecordingIds, markRecordingAsSynced, saveSyncedFile, logsync } = require("./db/querry");
const { ensureZoomAccessToken } = require("./zoom/zoomAuth");
const redisClient = require('./worker/redis')
const axios = require('axios')

async function retryUpload(fn, retries = 3, delay = 2000) {
  try {
    return await fn();
  } catch (err) {

    if (retries <= 0) {
      throw err;
    }

    console.log(`⚠️ Upload failed. Retrying in ${delay / 1000}s...`);

    await new Promise(resolve => setTimeout(resolve, delay));

    return retryUpload(fn, retries - 1, delay * 2); // exponential backoff
  }
}

async function syncOneDriveRecordings(oneDriveFolder, accessToken, selectedZoomRecordings,oneDriveToken) {

  const syncStarted = new Date();

  let newCount = 0;
  let duplicateCount = 0;
  let errors = null;
  let status = "success";

  console.log("\n===========================================");
  console.log("📄 Starting OneDrive Sync...");
  console.log("===========================================\n");

  try {

    //const syncedSet = await getSyncedRecordingIds("onedrive");

    //console.log(`Already synced recordings: ${syncedSet.size}`);

    const folderId = oneDriveFolder.folderId;
    const driveId = oneDriveFolder.driveId

    for (const recording of selectedZoomRecordings) {

      const { fileId, file_name, file_type, download_url } = recording;

     /* if (syncedSet.has(fileId)) {
        console.log(`❌ Duplicate skipped: ${file_name}`);
        duplicateCount++;
        continue;
      }*/


      try {

  console.log(`⬇️ Downloading & Uploading: ${file_name}`);

  const safeFileName = `${file_name}.${file_type.toLowerCase()}`.replace(/[^\w.-]/g, "_");



const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB — must be a multiple of 320KB for OneDrive

// ─── CONTINUE (resume after failure) ────────────────────────────────────────

const continueOneDriveUpload = async ({ uploadUrl, stream, size }) => {
  console.log("Continuing upload session:", uploadUrl);

  const session = await axios.get(uploadUrl);
  let offset = Number(session.data.nextExpectedRanges[0].split("-")[0]);

  let buffer = Buffer.alloc(0);

  async function uploadChunk(chunk, start) {
    const end = start + chunk.length - 1;

    const res = await axios.put(uploadUrl, chunk, {
      headers: {
        "Content-Length": chunk.length,
        "Content-Range": `bytes ${start}-${end}/${size}`,
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: 0,
    });

    console.log(`Uploaded ${end + 1}/${size}`);

    if (res.status === 200 || res.status === 201) {
      console.log("✅ Upload completed");
       return { done: true, data: res.data , status: 'Upload is successful', file:fileIndex};
    }

    return null; // 206 — in progress
  }

  for await (const data of stream) {
    buffer = Buffer.concat([buffer, data]);

    while (buffer.length >= CHUNK_SIZE) {
      const chunk = buffer.slice(0, CHUNK_SIZE);
      buffer = buffer.slice(CHUNK_SIZE);

      const start = offset;
      offset += chunk.length;

      // OneDrive requires sequential chunks — await each one
      const result = await uploadChunk(chunk, start);
      if (result) return result; // done
    }
  }

  // Flush remaining buffer
  if (buffer.length > 0) {
    const result = await uploadChunk(buffer, offset);
    if (result) return result;
  }
};

// ─── MAIN UPLOAD ─────────────────────────────────────────────────────────────

async function upload() {
  const { stream, size } = await getZoomStream(download_url, accessToken);

  const uploadUrl = await createUploadSessionByFolderId({
    oneDriveToken,
    driveId,
    folderId,
    fileName: safeFileName,
  });

  console.log("Upload session:", uploadUrl);

  let offset = 0;
  let buffer = Buffer.alloc(0);

  // uploadChunk now receives `start` (pre-increment) for accurate retry offset
  async function uploadChunk(chunk, start) {
    const end = start + chunk.length - 1;

    try {
      const res = await axios.put(uploadUrl, chunk, {
        headers: {
          "Content-Length": chunk.length,
          "Content-Range": `bytes ${start}-${end}/${size}`,
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 0,
      });

      console.log(`Uploaded ${end + 1}/${size}`);

      if (res.status === 200 || res.status === 201) {
        console.log("✅ Upload completed");
        return { done: true, data: res.data , status: 'Upload is successful', file:fileIndex};
      }

      if (res.status === 206) {
        return { done: false, status: 'Upload is in progress', file:fileIndex };
      }

    } catch (err) {
      console.error(`Chunk failed at offset ${start}:`, err.message);

      // FIX: pass `start` (not the already-incremented `offset`) to retry
      return retryUpload(async () => {
        const newAccessToken = await ensureZoomAccessToken(userId);

        const { stream: retryStream, size: retrySize } = await getZoomStream(
          download_url,
          newAccessToken,
          start // ✅ correct resume position
        );

        const data = await continueOneDriveUpload({
          uploadUrl,
          stream: retryStream,
          size: retrySize ?? size,
        });
         return data ? { done: true, data, status: "Upload is successful", file:fileIndex } : { done: false, status: "Upload failed" };
      });
       
    }
  }

  for await (const data of stream) {
    buffer = Buffer.concat([buffer, data]);

    while (buffer.length >= CHUNK_SIZE) {
      const chunk = buffer.slice(0, CHUNK_SIZE);
      buffer = buffer.slice(CHUNK_SIZE);

      const start = offset;
      offset += chunk.length;

      // OneDrive requires sequential order — await each chunk
      const result = await uploadChunk(chunk, start);
      if (result?.done) return result.data;
    }
  }

  // Flush remaining buffer
  if (buffer.length > 0) {
    const result = await uploadChunk(buffer, offset);
    if (result?.done) return result.data;
  }
}
upload()
  //await saveSyncedFile(driveFile, file_type, uuid);
  await markRecordingAsSynced({
          recording,
          provider: 'google',
          userId,
          driveFileId: driveFile.id,
          driveWebLink: driveFile.webViewLink,
        });
  //syncedSet.add(uuid);

  //newCount++;
  //console.log(`✓ Uploaded: ${file_name}`);

} catch (fileError) {
  console.error(`✗ Failed: ${file_name}`, fileError.response?.data || fileError.message);
  errors = fileError.message;
  status = "partial";
}
    }

    const syncCompleted = new Date();

    console.log("\n===========================================");
    console.log("✅ Sync Completed");
    console.log(`Uploaded: ${newCount}`);
    console.log(`Duplicates: ${duplicateCount}`);
    console.log("===========================================\n");

   /* await logsync({
      started: syncStarted,
      completed: syncCompleted,
      newCount,
      duplicateCount,
      errors,
      status
    });*/

  } catch (error) {

    console.error("❌ Sync failed:", error.message);

   /* await logsync({
      started: syncStarted,
      completed: new Date(),
      newCount,
      duplicateCount,
      errors: error.message,
      status: "failed"
    });*/

  }
}

module.exports = { syncOneDriveRecordings,  };