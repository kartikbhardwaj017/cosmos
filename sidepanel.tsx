import { useEffect, useState } from "react"

import { Storage } from "@plasmohq/storage"

const storage = new Storage()

function IndexSidePanel() {
  const [events, setEvents] = useState([])

  useEffect(() => {
    // Function to load events from chrome.storage
    const loadEvents = async () => {
      // Using a promise to handle the asynchronous chrome.storage API
      const promise = new Promise((resolve, reject) => {
        chrome.storage.local.get(["actionLogs"], function (result) {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError))
          } else {
            resolve(result.actionLogs || [])
          }
        })
      })

      try {
        const data = await storage.get("actionLogs") // "value"

        const actionLogs = await promise
        setEvents(actionLogs)
      } catch (error) {
        console.error("Failed to load events:", error)
      }
    }

    loadEvents()
    const onStorageChange = (changes, namespace) => {
      if (namespace === "local" && changes.actionLogs) {
        loadEvents() // Re-load events if actionLogs has changed
      }
    }

    chrome.storage.onChanged.addListener(onStorageChange)

    // Clean up the listener when the component unmounts
    return () => chrome.storage.onChanged.removeListener(onStorageChange)
  }, [])

  let getUrl = () => {
    const blob = new Blob([JSON.stringify(events)], { type: "text/plain" })

    // Create a URL for the Blob
    const url = URL.createObjectURL(blob)
    return url
  }
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        padding: 16,
        overflowY: "auto" // Add scrolling for many events
      }}>
      <button
        onClick={(event) => {
          chrome.storage.local.set({ actionLogs: [] })
        }}>
        Click here to start new recording
      </button>
      <div>
        <strong>steps:</strong>
        <ul>
          {events.length > 0
            ? events.map((event, index) => (
                <li key={index}>{JSON.stringify(event)}</li>
              ))
            : "Click to start recording"}
        </ul>
      </div>
      <a
        href={getUrl()}
        download={"commands.json"}
        onClick={(event) => {
          chrome.storage.local.set({ actionLogs: [] })
        }}>
        download steps json
      </a>
    </div>
  )
}

export default IndexSidePanel
