const {Worker} =  require ("bullmq")
const connection = require('../config/bullmqNodeRedisClient')
const {  syncOneDriveRecordings} = require('../utils/oneDriveRecordingsSync');
const {syncRecordings} = require('../syncRecordings')
const redisClient = require('../config/redis')

const oneDriveStreamWorker = async ()=>{ 
  try {new Worker('streamQueue',async(job)=>{
  if(job.name==="startOneDriveStream"){
      const{Folder,Token,ZoomRecordings,DriveToken} = job.data
    const key = `oneDrive_${job.id}`
    
    const setIdempotency = await redisClient.set(
      key,'processing',{NX: true, Ex: 3600}
    )

    if (!setIdempotency){
      return ;
    }
  
    await syncOneDriveRecordings(Folder,Token,ZoomRecordings,DriveToken)
  }
},{connection,
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 }})

  }catch(error){
        logger.error(`onedrive stream worker failure - ${error}`,{
      errorType: 'OtherError',
      location: './worker/onedrive.stream.worker'
    })
  }
}

    module.exports =  {oneDriveStreamWorker}