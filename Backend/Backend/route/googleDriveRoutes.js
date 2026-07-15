const express = require('express');
const route =  express.Router()
const rateLimiter = require('../middleware/rateLimiter')
const {startStream,connectGoogleDrive,googleAuth,googleOAuth} = require('../controller/googleDriveController')
const ensureCurrentUser = require('../middleware/userAuthentication')

route.post('/start_stream',rateLimiter,ensureCurrentUser,startStream)
route.get('/auth',rateLimiter,ensureCurrentUser,connectGoogleDrive)
route.get('/authorization',rateLimiter,ensureCurrentUser,googleAuth)
route.get('/redirect',rateLimiter,ensureCurrentUser,googleOAuth)