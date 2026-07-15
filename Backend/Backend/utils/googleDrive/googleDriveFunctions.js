// googleDriveFunctions.js
const { drive } = require('./googleOAuth');
const dotenv = require('dotenv');
const fs = require('fs');
dotenv.config();
const axios = require('axios');
const {ensureFreshAccessToken, oAuth2Client}= require ('./googleOAuth')

/**
 * Upload file to Google Drive with retry logic
 * Uses file path instead of stream to avoid timeout issues
 * 
 */


async function uploadToGoogleDrive(
  fileName,
  filePath,
  mimeType,
  fileSize,
  driveId
) {
  const maxRetries = 3;
  let lastError;
await ensureFreshAccessToken();
const accessToken = oAuth2Client.credentials.access_token;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (!driveId) {
        throw new Error('GOOGLE_DRIVE_FOLDER_ID not set');
      }

      console.log(`📤 Uploading (attempt ${attempt}/${maxRetries}): ${fileName}`);

      /** 1️⃣ Create resumable session */
      const metadata = {
        name: fileName,
        parents: [driveId]
      };

      const sessionRes = await axios.post(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable',
        metadata,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json; charset=UTF-8',
            'X-Upload-Content-Type': mimeType,
            'X-Upload-Content-Length': fileSize
          }
        }
      );

      const uploadUrl = sessionRes.headers.location;

      /** 2️⃣ Upload file */
      const fileStream = fs.createReadStream(filePath);

      const uploadRes = await axios.put(uploadUrl, fileStream, {
        headers: {
          'Content-Type': mimeType,
          'Content-Length': fileSize,
          'Content-Range': `bytes 0-${fileSize - 1}/${fileSize}`
        }
      });

      console.log(`\n✅ Upload complete: ${fileName}`);

      /** 3️⃣ Make file public */
      await drive.permissions.create({
        fileId: uploadRes.data.id,
        requestBody: {
          role: 'reader',
          type: 'anyone'
        },
        supportsAllDrives: true
      });

      return uploadRes.data;

    } catch (error) {
      lastError = error;
      console.error(`❌ Attempt ${attempt} failed:`, error.message);

      if (attempt < maxRetries) {
        console.log('🔁 Retrying in 3 seconds...');
        await new Promise(res => setTimeout(res, 3000));
      }
    }
  }

  throw lastError;
}

/**
 * Alternative: Upload large files in chunks using resumable upload
 * This is more reliable for very large files (>100MB)
 */

async function googleDriveUploadSession({ file_name, folderId, size, googleDriveAccessToken: accessToken, file_type }) {
  const mimeTypeMap = {
    'video': 'video/mp4',
    'audio': 'audio/m4a',
    'chat': 'text/plain',
    'transcript': 'text/vtt',
    'cc': 'text/vtt',
    'timeline': 'application/json',
  };
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
}

async function uploadLargeFileToGoogleDrive(

  
) {
  await ensureFreshAccessToken();
const accessToken = oAuth2Client.credentials.access_token;
  if (!driveId) {
    throw new Error('GOOGLE_DRIVE_FOLDER_ID not set');
  }

  

  console.log(`📤 Starting resumable upload: ${fileName}`);

  /** 1️⃣ Create resumable session */
  const metadata = {
    name: fileName,
    parents: [driveId]
  };

  const sessionRes = await axios.post(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable',
    metadata,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': mimeType,
        'X-Upload-Content-Length': fileSize
      }
    }
  );

  const uploadUrl = sessionRes.headers.location;
  const fd = fs.openSync(filePath, 'r');
  const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB
  let offset = 0;

  /** 2️⃣ Upload in chunks */
  let res;
  while (offset < fileSize) {
    const chunkSize = Math.min(CHUNK_SIZE, fileSize - offset);
    const buffer = Buffer.alloc(chunkSize);

    fs.readSync(fd, buffer, 0, chunkSize, offset);

    const end = offset + chunkSize - 1;

     res = await axios.put(uploadUrl, buffer, {
      headers: {
        'Content-Length': chunkSize,
        'Content-Type': mimeType,
        'Content-Range': `bytes ${offset}-${end}/${fileSize}`
      },
      validateStatus: s => s === 308 || s === 200
    });

    offset += chunkSize;

    const progress = ((offset / fileSize) * 100).toFixed(1);
    if (progress === '100') {
      console.log(`  ⬆️  Uploaded ${progress}% (${offset}/${fileSize} bytes)`);
    }
  }

  fs.closeSync(fd);

  console.log(`\n✅ Upload complete: ${fileName}`);

  /** 3️⃣ Make public */
  

  await drive.permissions.create({
    fileId: res.data.id,
    requestBody: { role: 'reader', type: 'anyone' },
    supportsAllDrives: true
  });

  return res.data;
}


module.exports = { 
  uploadToGoogleDrive,
  uploadLargeFileToGoogleDrive,
  googleDriveUploadSession 
};