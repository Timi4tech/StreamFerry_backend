const {Queue} =   require ( "bullmq")
const connection =  require("../config/bullmqNodeRedisClient")

const streamQueue = new Queue('streamQueue', {connection})
      .setGlobalConcurrency(400)
      .setGlobalRateLimit(1,100)
const googleQueue = new Queue('googleQueue', {connection})
      .setGlobalConcurrency(400)
      .setGlobalRateLimit(1,100)

      module.exports =  {streamQueue,googleQueue}