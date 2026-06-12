module.exports = {
  apps: [
  
    {
      name: "streamQueue",
      script: "./workers/onedrive.stream.worker.js",
      instances: 2,            // Run two separate stream worker processes
      autorestart: true,       // Keep alive indefinitely
      watch: false
    },
 {
      name: "googleQueue",
      script: "./workers/googledrive.stream.worker.js",
      instances: 2,            // Run two separate google worker processes
      autorestart: true,       // Keep alive indefinitely
      watch: false
    },
  ]
};
