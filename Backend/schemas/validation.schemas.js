const {z} = require('zod')
export const validationSchema = z.object({
     authUrl:z.string().url(), 
     selectedZoomRecordings:z.array(z.string()),
    googleDriveFolder:z.string(),
    removeOnComplete:z.number().int().positive().default(1000),
    removeOnfall:z.number().int().positive().default(5000),
    oneDriveFolder:z.string(),
    accessToken:z.string(),
    driveId:z.string(),
    folderId: z.string(),
    fileName:z.string()
})

export const zodErrorTree =  async(error)=>{
  const newError =  z.treeifyError(error)
    return newError
}
