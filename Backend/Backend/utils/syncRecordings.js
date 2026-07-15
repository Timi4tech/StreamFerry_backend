const { getZoomStream } = require("./utils/zoom/zoomApi");
const { ensureZoomAccessToken} = require('./utils/zoom/zoomAuth');
const { googleDriveUploadSession } = require('./utils/googleDrive/googleDriveFunctions');
const { ensureFreshAccessToken } = require('./utils/googleDrive/googleOAuth');
const { markRecordingAsSynced, logsync } = require('./db/querry');
             // ✅ socket helper
const axios = require('axios');
const { drive } = require('./utils/googleDrive/googleOAuth');

const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB

// ─── MIME TYPE MAP ────────────────────────────────────────────────────────────
const mimeTypeMap = {
  'video':      'video/mp4',
  'audio':      'audio/m4a',
  'chat':       'text/plain',
  'transcript': 'text/vtt',
  'cc':         'text/vtt',
  'timeline':   'application/json',
};

// ─── RETRY HELPER ─────────────────────────────────────────────────────────────
async function retryUpload(fn, retries = 3, delay = 2000) {
  try {
    return await fn();
  } catch (err) {
    if (retries <= 0) throw err;
    console.log(`⚠️ Upload failed. Retrying in ${delay / 1000}s...`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryUpload(fn, retries - 1, delay * 2);
  }
}

// ─── RESUME UPLOAD AFTER FAILURE ─────────────────────────────────────────────
const continueGoogleDriveUpload = async ({ uploadUrl, stream, size, fileIndex }) => {
  console.log("Continuing upload session:", uploadUrl);

  const session = await axios.put(uploadUrl, null, {
    headers: {
      "Content-Range": `bytes */${size}`,
      "Content-Length": 0,
    },
    validateStatus: (s) => [200, 201, 308].includes(s),
  });

  if (session.status === 200 || session.status === 201) {
    console.log("✅ Upload already completed");
    return session.data;
  }

  let offset = 0;
  const rangeHeader = session.headers["range"];
  if (rangeHeader) {
    offset = Number(rangeHeader.split("-")[1]) + 1;
  }

  console.log(`Resuming from byte offset: ${offset}`);
  let uploadedBytes = offset;
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
      validateStatus: (s) => [200, 201, 308].includes(s),
    });

    uploadedBytes += chunk.length;
    const percent = Math.round((uploadedBytes / size) * 100);                                    // ✅ emit progress
    console.log(`Uploaded ${end + 1}/${size}`);

    if (res.status === 200 || res.status === 201) {
      console.log("✅ Upload completed");
      await drive.permissions.create({
        fileId: res.data.id,
        requestBody: { role: 'reader', type: 'anyone' },
        supportsAllDrives: true,
      });
      return { done: true, data: res.data , status: "true", file:fileIndex};
    }

    return null; // 308 — still in progress
  }

for await (const data of stream) {
  buffer = Buffer.concat([buffer, data]);
  while (buffer.length >= CHUNK_SIZE) {
    const chunk = buffer.slice(0, CHUNK_SIZE);
    buffer = buffer.slice(CHUNK_SIZE);
    const start = offset;              // use current offset
    offset += chunk.length;
    const result = await uploadChunk(chunk, start);
    if (result) return result;
  
  }
}

  if (buffer.length > 0) {
    const result = await uploadChunk(buffer, offset);
    if (result) return result;
  }
};

// ─── MAIN UPLOAD ──────────────────────────────────────────────────────────────
async function upload({ recording, googleDriveFolder, fileIndex }) {
  const {  file_name, file_type, download_url } = recording;
  const folderId = googleDriveFolder.id;
  const mimeType = mimeTypeMap[file_type?.toLowerCase()] ?? 'application/octet-stream';

  const accessToken = await ensureZoomAccessToken();
  const { stream, size } = await getZoomStream(download_url, accessToken);
  const googleDriveAccessToken = await ensureFreshAccessToken();
  const uploadUrl = await googleDriveUploadSession({
    file_name, folderId, size, googleDriveAccessToken, file_type
  });

  console.log("Upload session:", uploadUrl);

  let offset = 0;
  let uploadedBytes = 0;
  let buffer = Buffer.alloc(0);


  async function uploadChunk(chunk, start) {
    const end = start + chunk.length - 1;

    try {
      const res = await axios.put(uploadUrl, chunk, {
        headers: {
          "Content-Length": chunk.length,
          "Content-Range": `bytes ${start}-${end}/${size}`,
          "Content-Type": mimeType,
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 0,
        validateStatus: (s) => [200, 201, 308].includes(s),
      });

      uploadedBytes += chunk.length;
      const percent = Math.round((uploadedBytes / size) * 100);
      onProgress(percent);                                      // ✅ emit per chunk
      console.log(`Uploaded ${end + 1}/${size}`);

      if (res.status === 200 || res.status === 201) {
        console.log("✅ Upload completed");
        await drive.permissions.create({
          fileId: res.data.id,
          requestBody: { role: "reader", type: "anyone" },
          supportsAllDrives: true,
        });
        return { done: true, data: res.data , status: 'Upload is successful', file:fileIndex};
      }

      if (res.status === 308) {
        return { done: false, status: "Retrying Upload..." };
      }

    } catch (err) {
      console.error(`Chunk failed at offset ${start}:`, err.message);

return retryUpload(async () => {
  const newAccessToken = await ensureZoomAccessToken();
  const { stream: retryStream, size: retrySize } = await getZoomStream(
    download_url, newAccessToken, start
  );
  const data = await continueGoogleDriveUpload({
    uploadUrl,
    stream: retryStream,
    size: retrySize ?? size,
    
  });
  return data ? { done: true, data, status: "Upload is successful", file:fileIndex } : { done: false, status: "Upload failed", file:fileIndex }; // ✅ match expected shape
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
      const result = await uploadChunk(chunk, start);
      if (result?.done) return result.data;
    }
  }

  if (buffer.length > 0) {
    const result = await uploadChunk(buffer, offset);
    if (result?.done) return result.data;
  }
}

// ─── SYNC ORCHESTRATOR ────────────────────────────────────────────────────────
async function syncRecordings({ selectedZoomRecordings, googleDriveFolder, userId }) {
  const syncStarted = new Date();
  let newCount = 0;
  let duplicateCount = 0;
  let errors = null;
  let status = 'success';
  const total = selectedZoomRecordings.length;

  console.log('\n===========================================');
  console.log('📄 Starting sync...', syncStarted.toISOString());
  console.log('===========================================\n');

  try {
    for (let i = 0; i < total; i++) {
      const recording = selectedZoomRecordings[i];
      const { file_name } = recording;


      try {
        console.log(`  ⬇️  Downloading ${file_name}...`);
        console.log(`  ⬆️  Uploading to Google Drive...`);

        const driveFile = await upload({
          recording,
          googleDriveFolder,
          fileIndex: i + 1,
        });

        // ✅ Save to DB
        await markRecordingAsSynced({
          recording,
          provider: 'google',
          userId,
          driveFileId: driveFile.id,
          driveWebLink: driveFile.webViewLink,
        });

        newCount++;

      

      } catch (fileError) {
        console.error(`  ✗ FAILED: ${file_name}`, fileError.message);
        errors = fileError.message;
        status = 'partial';

      }
    }

    const syncCompleted = new Date();

    console.log('\n===========================================');
    console.log('✅ Sync completed successfully!');
    console.log(`📊 New files uploaded: ${newCount}`);
    console.log(`⊗ Duplicates skipped: ${duplicateCount}`);
    console.log(`⏱️  Duration: ${((syncCompleted - syncStarted) / 1000).toFixed(2)}s`);
    console.log('===========================================\n');

    await logsync({ started: syncStarted, completed: syncCompleted, newCount, duplicateCount, errors, status });


  } catch (error) {
    console.error('\n❌ Sync failed:', error.message);
    status = 'failed';
    errors = error.message;

    await logsync({ started: syncStarted, completed: new Date(), newCount, duplicateCount, errors, status });

  }
}

module.exports = { syncRecordings };