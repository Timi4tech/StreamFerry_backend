##Project Name
    Stream Ferry
     A cloud to cloud streaming system. Users ship recordings from zoom cloud storage  to     either google cloud storage or ondrive cloud storage through stream ferry. 
  ## Features
             -   Zoom Oauth 2.0 (user login, Authorization and Authentication)
             -   Google Oauth 2.0( Authorization and Authentication)
             -   Onedrive Oauth 2.0 (Authorization and authentication)
             -   Google drive storage
             -   Onedrive storage
              -   Rate limiting and Idempotency
              -   Message queue and workers

  ##Tech Stack
         -   Node.js
         -   Express
         -   Mongo  Db
         -   Redis
         -  Google Oauth 2.0
         -  Mircosoft Oauth 2.0
         - Bullmq       

   ##installation
```bash
            git clone 
            cd trace_Sure
            npm install   ```

            ## Architectural design 
    [ “./docs/architectural_pattern.png”]


        ##Environment Variables
                     
                  #Zoom Api Credentials
                                     ZOOM_ACCOUNT_ID = [stream ferry app zoom account id]
                                     ZOOM_CLIENT_ID = [stream ferry app zoom client id]
                                     ZOOM_CLIENT_SECRET= [stream ferry app  zoom client secret]
                                     ZOOM_REDIRECT_URI = [stream ferry app zoom Oauth redirect url]
                    #Google  Api Credentials
                                      GOOGLE_CLIENT_ID = [ stream ferry app’s google client id]
                                      GOOGLE_CLIENT_SECRET = [stream ferry app’s  google  client secret]
                                      GOOGLE_REFRESH_TOKEN =  [stream ferry app’s google refreshtoken]
                                      GOOGLE_REDIRECT_URI = [stream ferry app ‘s google oauth 2.0 redirect                                                      
                                        url]
                      # Microsoft  Graph API Credentials
                                        MICROSOFT_CLIENT_ID  = [stream ferry app’s Azure client id]
                                         MICROSOFT_CLIENT_SECRET = [stream ferry app’s Azure client secret]
                                         MICROSOFT_TENANT_ID = [stream ferry app’s Azure tenant id]
                                         MICROSOFT_URL_REDIRECT =  [stream ferry app’s microsoft Oauth 2. 0                                            
                                                                   redirect url]
                      #PORT
                               Port = [default]
                                  
                       #Node Development Stage
                                      NODE_ENV = [development stage]
                          UPSTASH_REDIS_URL = [upstash’s redis url]
                            UPSTASH_REDIS_TOKEN = [upstash’s redis token]
                 
     
                                # CORS 
                                       FRONTEND_URL= [your frontend url e,g http://localhost:5173]
                                        BACKEND_URL = [your backend url e.g http://localhost:3001]

                                 #DATABASE
                                             MONGO_URI = [Mongo DB url]


##API End Points
       #Zoom Api End Point
               GET    -  /zoom/auth  - `Get zoom accesstoken` 
               GET    -  /zoom/fetchzoomrecordings - `Fetch zoom recordings`
               GET   -  /zoom/authorization  -      `zoom authorization`
                GET -  /zoom/redirect   -    `Zoom redirect url`
       #Google Api End Point
                 POST  -  /google/start_stream  -  `Start stream from zoom cloud to google drive`
                  GET -   /google/auth -  `Google  Oauth 2.0`
                  GET -   /google/authorization -  `Google drive authorization`
                   GET -  /google/redirect  -  `Google auth redirect`
         #Onedrive Api End Point
                     GET -       /onedrive/folders -    `fetch folders`
                     GET-       /onedrive/authentication - `Microsoft 0auth`
                      GET-      /onedrive/authorization-    `Onedrive authorization`
                      GET-      /onedrive/redirect - `Onedrive auth redirect`
                       POST-     /onedrive/UploadSession -  `Onedrive upload session`
                        POST-   /onedrive/start_streams - `start onedrive upload from zoom cloud to                                                                              
                                                     onedrive `
                                   ## Running Trace Sure
   Development: 
     ```bash 
            Npm run dev
      ```
Production:
       ```bash
          Npm start
        ```
## contributing 
Pull requests are welcome
##License
MIT


