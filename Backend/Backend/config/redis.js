
const  { Redis } =  require ( '@upstash/redis')
const dotenv = require('dotenv');
dotenv.config();


const redisClient = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
})

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