const {Worker} =  require ("bullmq")
const connection = require('../config/bullmqNodeRedisClient')
const {  syncOneDriveRecordings} = require('../utils/oneDriveRecordingsSync');
const {syncRecordings} = require('../syncRecordings')
const redisClient = require('../config/redis')

 const googleStreamWorker =  new Worker('googleQueue',async(job)=>{
  if(job.name==="startGoogleStream"){
    const{Folder,ZoomRecordings,Id} = job.data
    const key = `googleDrive_${job.id}`
    
    const setIdempotency = await redisClient.set(
      key,'processing',{NX: true, Ex: 3600}
    )

    if (!setIdempotency){
      return ;
    }
    await syncRecordings(Folder,ZoomRecordings,Id)
  }
},{connection,
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 }})

    module.exports =  {googleStreamWorker}