import type { PlasmoMessaging } from "@plasmohq/messaging"
import { Storage } from "@plasmohq/storage"

const storage = new Storage()

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  console.log(req)
  const currCount = await storage.get('clickCount');
  res.send({
    count: currCount || 0
  })
}

export default handler
