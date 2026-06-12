const express = require('express');
const route =  express.Router();
const {getzoomAccesstoken,fetchZoomRecordings,zoomAuthurl,getZoomCallBack} = require('../controller/zoomController')
const ensureCurrentUser = require('../middleware/userAuthentication')
const rateLimiter = require('../middleware/rateLimiter')

route.get('/auth',rateLimiter,ensureCurrentUser,getzoomAccesstoken)
route.get('/fetchzoomrecordings',rateLimiter,ensureCurrentUser,fetchZoomRecordings)
route.get('/authorization',rateLimiter,zoomAuthurl)
route.get('/redirect',rateLimiter,getZoomCallBack)