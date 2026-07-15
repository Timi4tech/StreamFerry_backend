
const  { Redis } =  require ( '@upstash/redis')
const {env} = require("./env.config")
const logger = reqire("../logger/logger")


const redisClient = async()=>{ 
  try{
    const connect = await new Redis({
  url: env.UPSTASH_REDIS_URL,
  token: env.UPSTASH_REDIS_TOKEN,
    if(connect){ logger.info("Upstash Connected Successfully")}
})
}catch(error){
  logger.error(`Upstash redis error - ${error}`,{
    errorType: "ConnectionError",
    field: "./config/redis.config"
  })
}
}
module.exports = redisClient;


// your Upstash URL
/*const url = process.env.UPSTASH_REDIS_URL;

const client = createClient({ url });
await client.connect();

await client.set("hello", "world");
console.log(await client.get("hello"));

await client.quit();*/



//await redis.set("foo", "bar");
//await redis.get("foo");