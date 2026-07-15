const ioredis =  require ('ioredis')
const {env} = require("./env.config")
const logger = reqire("../logger/logger")

const connection = async()=>{
   try{new ioredis(
     env.IOREDIS_TCP_URL
)}catch(error){
   logger.error(`Upstash redis connection failed-${error}`,{
      errorType: "ValidateError",
      field: "./env.config"
   })
}
}
 module.exports = connection