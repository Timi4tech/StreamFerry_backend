const ioredis =  require ('ioredis')


const connection =  new ioredis(
   process.env.UPSTASH_REDIS_URL
)

 module.exports = connection