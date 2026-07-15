const { drive, ensureFreshAccessToken } = require('./googleOAuth');

async function listFolders() {
  try {
    // Ensure we have a valid token
    await ensureFreshAccessToken();

    console.log('📁 Fetching all folders from Google Drive...\n');

    // Query for folders only
    const response = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.folder'",
      fields: 'files(id, name)',
      pageSize: 100, // Adjust as needed
      orderBy: 'name', // Sort alphabetically
    });

    const folders = response.data.files;

    if (folders.length === 0) {
      console.log('No folders found.');
      return [];
    }

    console.log(`Found ${folders.length} folders:\n`);
    
    folders.forEach((folder, index) => {
      console.log(`${index + 1}. ${folder.name}`);
      console.log(`   ID: ${folder.id}`);
      console.log(`   Created: ${new Date(folder.createdTime).toLocaleString()}`);
      console.log(`   Modified: ${new Date(folder.modifiedTime).toLocaleString()}`);
      console.log('');
    });

    return folders;

  } catch (error) {
    console.error('❌ Error fetching folders:', error.message);
    throw error;
  }
}

async function createFolder(folderName) {
  try {
    const res = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      },
      fields: 'id, name',
    });

    console.log(`Folder created: ${res.data.name} (${res.data.id})`);
    return res.data.id;
  } catch (err) {
    console.error('Error creating folder:', err);
  }
}


module.exports = { listFolders, createFolder };