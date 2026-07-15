const redis =  require('../config/redis.config')

const LIMIT = 10
const REFILL_RATE = 1 // per second

 const rateLimiter = async (req, res, next) => {
  const userId = req.session.user._id || req.ip
  const key = `rate:${userId}`
  const now = Date.now()

  try {
    let data = await redis.get(key)
    if (data) {
      data = typeof data === "string" ? JSON.parse(data) : data
    } else {
      data = {
        tokens: LIMIT,
        lastRefill: now,
      }
    }

    // Refill logic
    const timePassed = (now - data.lastRefill) / 1000
    const refill = Math.floor(timePassed * REFILL_RATE)
    
    data.tokens = Math.min(LIMIT, data.tokens + refill)
    data.lastRefill = now

    if (data.tokens <= 0) {

      logger.warn(`User_${userId} too many requests`, {
        errorType: 'OtherError',
        location: './middleware/rateLimiter.middleware'
      });
      
      return res.status(429).json({ message: "Too many requests" })
    }

    await redis.set(key, JSON.stringify(data), { ex: 10000})

    next()

  } catch (err) {
    // Fail open — don't block requests if Redis has an issue
    res.status(400).json({message:'request can be completed', error:err})
    
  }
}

module.exports = redis