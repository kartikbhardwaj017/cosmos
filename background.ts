chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  console.log(request)
  chrome.storage.local.get(["actionLogs"], function (result) {
    let actionLogs = result.actionLogs || []
    console.log("received action logs ", actionLogs)
    actionLogs = [request, ...actionLogs]
    console.log("received action logs ", actionLogs)
    chrome.storage.local.set({ actionLogs: actionLogs }, function () {
      console.log("successfully writen")
      sendResponse({ status: "success" })
    })
  })
  return true
})
