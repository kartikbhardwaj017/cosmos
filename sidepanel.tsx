import { useEffect, useState } from "react"

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

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        padding: 16,
        overflowY: "auto" // Add scrolling for many events
      }}>
      <h2>
        Welcome to your
        <a
          href="https://www.plasmo.com"
          target="_blank"
          rel="noopener noreferrer">
          {" "}
          Plasmo
        </a>{" "}
        Extension!
      </h2>
      <div>
        <strong>Events:</strong>
        <ul>
          {events.map((event, index) => (
            <li key={index}>{JSON.stringify(event)}</li>
          ))}
        </ul>
      </div>
      <a
        href="https://docs.plasmo.com"
        target="_blank"
        rel="noopener noreferrer">
        View Docs
      </a>
    </div>
  )
}

export default IndexSidePanel
