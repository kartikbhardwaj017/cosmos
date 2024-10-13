import type { PlasmoMessaging } from "@plasmohq/messaging"
import { Storage } from "@plasmohq/storage"
import {
  connect,
  ExtensionTransport,
} from 'puppeteer-core/lib/esm/puppeteer/puppeteer-core-browser.js';
const storage = new Storage()

let worker = (async (tabId) => {
  let browser;
  try {
    console.log(chrome)


    browser = await connect({
      transport: await ExtensionTransport.connectTab(tabId),
    });
    console.log(`browser is `, browser)
    const [page] = await browser.pages();
    let commands = [{
      "command": "click",
      "target": [
        ["xpath=(//div[@id='prompt-textarea']/p)[1]"],
      ],
      "value": ""
    },
    {
      "command": "type",
      "target": [
        ["xpath=(//div[@id='prompt-textarea']/p)[1]"],
      ],
      "value": "Hello bro"
    }]

    for (let command of commands) {
      try {
        switch (command.command) {
          case "click":
            await tryClick3(page, command.target);
            try {
            } catch (error) {
              // await takeScreenshotOfNodes(page);
              console.log("Navigation timeout, proceeding...", error);
            }

            break;

          case "type":
            await tryType(page, command.target, command.value);
            break;

          case "newTab":
            // Open new tab with the provided location
            console.log("trying to navigate to next page");
            const pages = await browser.pages();

            // Assuming you are currently on one tab, and you want to go to the next tab
            const currentIndex = pages.indexOf(page);

            // Go to the next tab, if available
            if (currentIndex + 1 < pages.length) {
              const nextPage = pages[currentIndex + 1];
              await nextPage.bringToFront(); // Brings the next tab into focus
              await nextPage.screenshot({
                path: "./steps/newPage_screenshot.png",
                fullPage: false,
              });
            } else {
              console.log("No more tabs to switch to.");
            }
            // const newPage = await browser.newPage();
            // await newPage.goto(command.location, {
            //   waitUntil: "networkidle0",
            //   timeout: 10000, // Adjust this timeout if needed
            // });

            console.log(`Opened new tab with URL: ${command.location}`);
            // Optionally, you can wait for network idle after navigation

            break;

          default:
            console.log("Unknown command", command.command);
        }
      } catch (error) {
        console.log(error);
      } finally {
        // await drawBoundingBoxesAndTakeScreenshot3(page);


      }

      // Take a screenshot after every command
    }

    // console.log(`tab id is ${tabId}`)
    console.log(await page.evaluate('document.title'));
  } catch (error) {
    console.log(error);
  } finally {
    browser.disconnect();

  }

})

async function tryClick3(page, targets) {
  // Setup a listener for new tabs that may be created during the click action
  for (let target of targets) {
    for (let locator of target) {
      try {
        await page.waitForSelector(locator, { timeout: 500 });
        await page.click(locator);
        console.log("Clicked on:", locator);


      } catch (error) {
        console.log("Failed to click using", locator, error);
      }
    }
  }

}

// Helper function to implement a delay

async function tryType(page, targets, value) {
  for (let target of targets) {
    for (let locator of target) {
      try {
        await page.waitForSelector(locator, { timeout: 500 });
        await page.type(locator, value, { delay: 100 }); // Optional delay between keystrokes
        console.log("Typed value into:", locator);
        return; // Break if successful
      } catch (error) {
        console.log("Failed to type using", locator, error);
      }
    }
  }
  throw new Error("None of the typing locators worked.");
}

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  try {
    console.log("hello sir ");
    console.log(req);
    console.log(req.tabId)
    const currCount = await storage.get('clickCount');
    await worker(req.sender.tab.id);
    res.send({
      count: currCount || 0
    })
  } catch (error) {
    console.log(error);
  }

}

export default handler
