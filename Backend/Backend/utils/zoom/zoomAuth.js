const  axios = require ("axios");
const dotenv = require("dotenv");
const  { createUser } = require('../../db/querry.js');
dotenv.config();
const { URLSearchParams } =  require ('node:url');
const redisClient = require('../../worker/redis');
 function getZoomAuthUrl() {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.ZOOM_CLIENT_ID,
    redirect_uri: process.env.ZOOM_REDIRECT_URI
  });

  return `https://zoom.us/oauth/authorize?${params.toString()}`;
}



async function zoomCallback(req, res) {
  const { code } = req.query;

  const response = await axios.post(
    "https://zoom.us/oauth/token",
    null,
    {
      params: {
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.ZOOM_REDIRECT_URI,
      },
      auth: {
        username: process.env.ZOOM_CLIENT_ID,
        password: process.env.ZOOM_CLIENT_SECRET,
      },
    }
  );

  const { access_token, refresh_token, } = response.data;
  const userResponse = await axios.get(
      "https://api.zoom.us/v2/users/me",
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    const zoomUser = userResponse.data;
    const user = await createUser(zoomUser.email, `${zoomUser.first_name} ${zoomUser.last_name}`, "zoom", zoomUser.id);
    const userId = user._id;
    req.session.user = {
      id: userId,
      email: zoomUser.email,
      name: `${zoomUser.first_name} ${zoomUser.last_name}`,
    };
   
    await redisClient.set(`zoom:accessToken:${userId}`, access_token,{EX: 3600})
    await redisClient.set( `zoom:refreshToken:${userId}`, refresh_token,{ EX: 15 * 24 * 60 * 60 });
  

  console.log("Zoom Access Token:", access_token);

  req.session.save((err) => {
  if (err) {
    console.error("Session save error:", err);
    return res.redirect("http://localhost:5173/login");
  }

  res.redirect("http://localhost:5173/dashboard");
});
}

async function refreshZoomToken(refreshToken) {
  const response = await axios.post(
    "https://zoom.us/oauth/token",
    null,
    {
      params: {
        grant_type: "refresh_token",
        refresh_token: refreshToken
      },
      auth: {
        username: process.env.ZOOM_CLIENT_ID,
        password: process.env.ZOOM_CLIENT_SECRET
      }
    }
  );

  return {
    accessToken: response.data.access_token,
    refreshToken: response.data.refresh_token,
    expiresIn: response.data.expires_in
  };
}


async function ensureZoomAccessToken(req,res) {
  const userId = req.session.user.id
  let accessToken = await redisClient.get(`zoom:accessToken:${userId}`);
  if (!accessToken) {
    const refreshToken = await redisClient.get(`zoom:refreshToken:${userId}`);
    const newTokens = await refreshZoomToken(refreshToken);
    accessToken = newTokens.accessToken;
    refreshToken = newTokens.refreshToken;

    await redisClient.set(`zoom:refreshToken:${userId}`, refreshToken,{EX:15 * 24 * 60 * 60})
    await redisClient.set(`zoom:accessToken:${userId}`, accessToken,{EX:15 * 24 * 60 * 60})
  }

  return (accessToken);
}


module.exports = {
  getZoomAuthUrl,
  zoomCallback,
  refreshZoomToken,
  ensureZoomAccessToken
};