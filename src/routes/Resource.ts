import { Hono } from "hono";
import { getHardwareInfo,getResourcesUsage } from "../info/system.js";
const ResourceRouter = new Hono();
//GET /hardware/resources
ResourceRouter.get('/resources', async (c) => {
  return c.json({
    data: await getResourcesUsage(),
    success: true,
  });
});
ResourceRouter.get('/hardware', async (c) => {
  return c.json({
    data: await getHardwareInfo(),
    success: true,
  });
})

export { ResourceRouter };
