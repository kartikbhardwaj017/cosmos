import React, { useEffect, useState } from "react"

import { Storage } from "@plasmohq/storage"

const storage = new Storage()

function IndexSidePanel() {
  const [events, setEvents] = useState([])
  const [isRecording, setIsRecording] = useState(false) // State to track recording status
  const [circleOpacity, setCircleOpacity] = useState(1) // State for blinking effect

  // State for adding new steps
  const [addingStepIndex, setAddingStepIndex] = useState(null) // Index where new step is being added
  const [newStepCommand, setNewStepCommand] = useState("wait") // Default command type for new step
  const [newStepSelector, setNewStepSelector] = useState("") // Selector for new step

  // State for editing existing steps
  const [editingStepIndex, setEditingStepIndex] = useState(null) // Index of the step being edited
  const [editedStepValue, setEditedStepValue] = useState("") // Value being edited

  // State for adding genAI instructions
  const [editingGenAIIndex, setEditingGenAIIndex] = useState(null) // Index of the step being edited for genAI instructions
  const [genAIInstructions, setGenAIInstructions] = useState("") // genAI instructions text

  useEffect(() => {
    // Function to load events from chrome.storage
    const loadEvents = async () => {
      try {
        const actionLogs = await new Promise((resolve, reject) => {
          chrome.storage.local.get(["actionLogs"], (result) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError))
            } else {
              resolve(result.actionLogs || [])
            }
          })
        })
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

  // Effect for blinking circle
  useEffect(() => {
    let intervalId

    if (isRecording) {
      intervalId = setInterval(() => {
        setCircleOpacity((prev) => (prev === 1 ? 0 : 1))
      }, 500) // Blink every 500ms
    } else {
      setCircleOpacity(1) // Reset opacity when not recording
    }

    return () => {
      clearInterval(intervalId)
    }
  }, [isRecording])

  const getUrl = () => {
    const blob = new Blob([JSON.stringify(events)], { type: "text/plain" })
    return URL.createObjectURL(blob)
  }

  // Function to get the shortest target
  const getShortestTarget = (targets) => {
    if (!targets || targets.length === 0) return ""
    let shortestTarget = targets.reduce((shortest, current) =>
      current[0].length < shortest[0].length ? current : shortest
    )[0]
    return shortestTarget.length > 10
      ? shortestTarget.substring(0, 10) + "..."
      : shortestTarget
  }
  const minifyText = (shortestTarget) => {
    return shortestTarget.length > 20
      ? shortestTarget.substring(0, 10) + "..."
      : shortestTarget
  }

  // Function to get the icon based on command
  const getCommandIcon = (command) => {
    switch (command) {
      case "click":
        return "🖱️" // Mouse click icon
      case "editContent":
      case "type":
      case "sendKeys":
        return "⌨️" // Keyboard icon
      case "input":
        return "✏️" // Pencil icon
      case "extract":
      case "store":
        return "📄" // Document icon
      case "wait":
        return "⏳" // Hourglass icon
      case "fillCaptcha":
        return "🔒" // Lock icon
      // Add more cases for different commands
      default:
        return "➡️" // Default icon for a single step
    }
  }

  const handleDeleteStep = (index) => {
    const updatedEvents = [...events]
    updatedEvents.splice(index, 1)
    setEvents(updatedEvents)
    chrome.storage.local.set({ actionLogs: updatedEvents })
  }

  const handleEditStep = (index) => {
    // Set the editingStepIndex to index
    setEditingStepIndex(index)
    // Get the step being edited
    const stepToEdit = events[index]
    // Initialize the editedStepValue
    setEditedStepValue(stepToEdit.value || "")
  }

  // Handler to save the edited step
  const handleSaveEditedStep = () => {
    // Create the updated step object
    const updatedStep = {
      ...events[editingStepIndex],
      value: editedStepValue
    }

    // Update the events array
    const updatedEvents = [...events]
    updatedEvents[editingStepIndex] = updatedStep

    // Update state and storage
    setEvents(updatedEvents)
    chrome.storage.local.set({ actionLogs: updatedEvents })

    // Reset editing state
    setEditingStepIndex(null)
    setEditedStepValue("")
  }

  // Handler to cancel editing a step
  const handleCancelEditStep = () => {
    // Reset editing state
    setEditingStepIndex(null)
    setEditedStepValue("")
  }

  // Handler to save the new step
  const handleSaveStep = () => {
    // Create new step object
    const newStep = {
      command: newStepCommand,
      target: "",
      value: newStepSelector ? newStepSelector.trim() : ""
    }

    // Insert new step into events array at addingStepIndex
    const updatedEvents = [...events]
    updatedEvents.splice(addingStepIndex, 0, newStep)

    // Update state and storage
    setEvents(updatedEvents)
    chrome.storage.local.set({ actionLogs: updatedEvents })

    // Reset adding step state
    setAddingStepIndex(null)
    setNewStepCommand("wait") // Reset to default command
    setNewStepSelector("")
  }

  // Handler to cancel adding a new step
  const handleCancelAddStep = () => {
    setAddingStepIndex(null)
    setNewStepCommand("wait") // Reset to default command
    setNewStepSelector("")
  }

  // Handler to save genAI instructions
  const handleSaveGenAIInstructions = () => {
    // Update the event with genAI instructions
    const updatedEvents = [...events]
    updatedEvents[editingGenAIIndex] = {
      ...updatedEvents[editingGenAIIndex],
      genAIInstructions: genAIInstructions.trim()
    }

    // Update state and storage
    setEvents(updatedEvents)
    chrome.storage.local.set({ actionLogs: updatedEvents })

    // Reset genAI editing state
    setEditingGenAIIndex(null)
    setGenAIInstructions("")
  }

  // Handler to cancel genAI instructions editing
  const handleCancelGenAIInstructions = () => {
    setEditingGenAIIndex(null)
    setGenAIInstructions("")
  }

  // Function to render the add step form
  const renderAddStepForm = () => (
    <div style={{ marginBottom: "10px" }}>
      {/* Command Type Dropdown */}
      <select
        value={newStepCommand}
        onChange={(e) => setNewStepCommand(e.target.value)}
        style={{ marginRight: "5px", width: "150px" }}>
        <option value="wait">wait</option>
        <option value="fillCaptcha">fillCaptcha</option>
        <option value="newTab">newTab</option>
        {/* Add more command options as needed */}
      </select>

      {/* Selector Input */}
      <input
        type="text"
        placeholder="value "
        value={newStepSelector}
        onChange={(e) => setNewStepSelector(e.target.value)}
        style={{ marginRight: "5px", width: "150px" }}
      />
      <button onClick={handleSaveStep} style={{ marginRight: "5px" }}>
        Save
      </button>
      <button onClick={handleCancelAddStep}>Cancel</button>
    </div>
  )

  // Function to render the edit step form
  const renderEditStepForm = () => (
    <div style={{ marginBottom: "10px" }}>
      {/* Value Input */}
      <input
        type="text"
        placeholder="value"
        value={editedStepValue}
        onChange={(e) => setEditedStepValue(e.target.value)}
        style={{ marginRight: "5px", width: "150px" }}
      />

      <button onClick={handleSaveEditedStep} style={{ marginRight: "5px" }}>
        Save
      </button>
      <button onClick={handleCancelEditStep}>Cancel</button>
    </div>
  )

  // Function to render genAI instructions form
  const renderGenAIInstructionsForm = () => (
    <div style={{ marginBottom: "10px" }}>
      <textarea
        placeholder="Enter genAI instructions (optional)"
        value={genAIInstructions}
        onChange={(e) => setGenAIInstructions(e.target.value)}
        style={{ marginRight: "5px", width: "300px", height: "60px" }}
      />
      <br />
      <button
        onClick={handleSaveGenAIInstructions}
        style={{ marginRight: "5px" }}>
        Save
      </button>
      <button onClick={handleCancelGenAIInstructions}>Cancel</button>
    </div>
  )

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        padding: 16,
        overflowY: "auto" // Add scrolling for many events
      }}>
      {/* Container for buttons and recording indicator */}
      <div style={{ display: "flex", alignItems: "center" }}>
        <button
          onClick={() => {
            if (isRecording) {
              // Stop recording
              setIsRecording(false)
            } else {
              // Start recording
              chrome.storage.local.set({ actionLogs: [] })
              setEvents([])
              setIsRecording(true)
            }
          }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              marginRight: "5px",
              color: isRecording ? "green" : "red",
              fontSize: "25px"
            }}>
            {isRecording ? "■" : "●"}
          </span>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: "16px"
            }}>
            {isRecording ? "Stop " : "Start "}
          </span>
        </button>

        {/* Recording Indicator */}
        {isRecording && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginLeft: "10px"
            }}>
            <div
              style={{
                height: "15px",
                width: "15px",
                backgroundColor: "#e80600",
                borderRadius: "50%",
                marginRight: "5px",
                opacity: circleOpacity,
                transition: "opacity 0.5s"
              }}></div>
            <span
              style={{
                color: "#e80600"
              }}>
              Recording...
            </span>
          </div>
        )}
      </div>

      {/* Clear Steps Button */}

      <div>
        {events.length > 100 ? (
          <button
            onClick={() => {
              chrome.storage.local.set({ actionLogs: [] })
              setEvents([])
            }}
            style={{ fontSize: "16px", margin: "5px" }}>
            <span style={{ marginRight: "5px" }}>🗑️</span>
            Clear steps
          </button>
        ) : (
          ""
        )}

        <ol style={{ listStyleType: "none", paddingLeft: 0 }}>
          {/* If adding a step at the beginning */}
          {addingStepIndex === 0 && <li>{renderAddStepForm()}</li>}

          {events.length > 0 ? (
            events.map((event, index) => (
              <React.Fragment key={index}>
                <li
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "5px"
                  }}>
                  {/* Step Details */}
                  <div
                    style={{
                      flexGrow: 1,
                      display: "flex",
                      alignItems: "center"
                    }}>
                    <span style={{ marginRight: "5px" }}>
                      {getCommandIcon(event.command)}
                    </span>
                    <span>
                      <strong>{event.command}</strong>
                      {getShortestTarget(event.target) && (
                        <>
                          {" "}
                          on <em>{getShortestTarget(event.target)}</em>
                        </>
                      )}
                      {event.value && event.value !== "<p></p>" && (
                        <>
                          {" "}
                          with value <em>{minifyText(event.value)}</em>
                        </>
                      )}
                      {event.genAIInstructions && (
                        <>
                          {" "}
                          <span title="genAI instructions">💡</span>
                        </>
                      )}
                    </span>
                  </div>
                  {/* Edit Step Icon */}
                  <button
                    onClick={() => handleEditStep(index)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "16px",
                      padding: "0 5px"
                    }}
                    title="Edit this step">
                    ✏️
                  </button>

                  {/* Add Step Icon */}
                  <button
                    onClick={() => setAddingStepIndex(index + 1)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "16px",
                      padding: "0 5px"
                    }}
                    title="Add step after this">
                    ➕
                  </button>

                  {/* Delete Step Icon */}

                  <button
                    onClick={() => handleDeleteStep(index)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "16px",
                      padding: "0 5px"
                    }}
                    title="Delete this step">
                    ❌
                  </button>
                  {/* genAI Instructions Icon */}
                  <button
                    onClick={() => {
                      setEditingGenAIIndex(index)
                      setGenAIInstructions(event.genAIInstructions || "")
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "16px",
                      padding: "0 5px"
                    }}
                    title="Add/Edit genAI instructions">
                    🤖
                  </button>
                </li>

                {/* Render edit step form if editing this step */}
                {editingStepIndex === index && <li>{renderEditStepForm()}</li>}

                {/* Render add step form after the current step if addingStepIndex === index + 1 */}
                {addingStepIndex === index + 1 && (
                  <li>{renderAddStepForm()}</li>
                )}

                {/* Render genAI instructions form if editing this step */}
                {editingGenAIIndex === index && (
                  <li>{renderGenAIInstructionsForm()}</li>
                )}
              </React.Fragment>
            ))
          ) : (
            <li>No steps recorded.</li>
          )}

          {/* If no steps exist and adding at index 0 */}
          {events.length === 0 && addingStepIndex === 0 && (
            <li>{renderAddStepForm()}</li>
          )}
        </ol>
      </div>

      <a
        href={getUrl()}
        download={"commands.json"}
        style={{ marginTop: "10px" }}>
        Save the recording
      </a>
    </div>
  )
}

export default IndexSidePanel
