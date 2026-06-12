const express = require('express');
const route =  express.Router();
const rateLimiter = require('../middleware/rateLimiter')
const {getOneDriveFolders,connectOneDrive,startOneDriveStream,
    oneDriveAuthUrl,oneDriveAuth,createUploadSession} = require('../controller/oneDriveController')
const ensureCurrentUser = require('../middleware/userAuthentication')

route.get("/folders",rateLimiter,ensureCurrentUser,getOneDriveFolders)
route.get('/authentication',rateLimiter,ensureCurrentUser,connectOneDrive)
route.post('/start_Streams',rateLimiter,ensureCurrentUser, startOneDriveStream)
route.get('/authorization',rateLimiter,ensureCurrentUser,oneDriveAuthUrl)
route.get('/redirect',rateLimiter,ensureCurrentUser,oneDriveAuth)
route.post("/UploadSession",rateLimiter,ensureCurrentUser,createUploadSession)
