import { useEffect, useState } from "react";



import { useStorage } from "@plasmohq/storage/hook";





const ActionSheet = ({ options, onClose, x, y, selectedElement }) => {
  const handleOptionClick = (event, action) => {
    event.stopPropagation() // Stop the event from bubbling up
    action(event, selectedElement)
    onClose() // Close the menu after the action
  }
  return (
    <div
      className="action-sheet"
      style={{
        position: "absolute",
        top: y,
        left: x,
        background: "white",
        border: "1px solid black",
        zIndex: 1000
      }}>
      {options.map((option, index) => (
        <div
          key={index}
          onClick={(event) => handleOptionClick(event, option.action)}
          style={{ padding: "10px" }}>
          {option.label}
        </div>
      ))}
    </div>
  )
}

const HoverButton = () => {
  const [crosshair, setCrosshair] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 })
  const [selectedElement, setSelectedElement] = useState(null)

  const toggleExtractButton = () => {
    if (!crosshair) {
      document.body.classList.add("crosshairCursor")
    } else {
      document.body.classList.remove("crosshairCursor")
    }
    setCrosshair(!crosshair)
  }

  const handleClickOutside = (event) => {
    if (crosshair && !event.target.closest(".action-sheet")) {
      console.log(event.target)
      setMenuPosition({ x: event.pageX, y: event.pageY })
      setShowMenu(true)
      setSelectedElement(event.target)
    } else {
      setShowMenu(false)
    }
  }

  useEffect(() => {
    const addBorder = (event) => {
      if (crosshair) {
        event.target.style.border = "2px solid red"
      }
    }

    const removeBorder = (event) => {
      event.target.style.border = ""
    }

    if (crosshair) {
      window.addEventListener("mouseover", addBorder)
      window.addEventListener("mouseout", removeBorder)
    }

    return () => {
      window.removeEventListener("mouseover", addBorder)
      window.removeEventListener("mouseout", removeBorder)
    }
  }, [crosshair])

  useEffect(() => {
    document.addEventListener("click", handleClickOutside)

    return () => {
      document.removeEventListener("click", handleClickOutside)
    }
  }, [crosshair])

  const options = [
    {
      label: "Extract the element text",
      action: (event, selectedElement) => {
        window.record(
          "extract",
          window.locatorBuilders.buildAll(selectedElement),
          event.target.value
        )
      }
    }
  ]

  return (
    <>
      <button
        onClick={toggleExtractButton}
        style={{ cursor: crosshair ? "crosshair" : "auto" }}>
        Activate Crosshair
      </button>
      {showMenu && (
        <ActionSheet
          options={options}
          x={menuPosition.x}
          y={menuPosition.y}
          selectedElement={selectedElement}
          onClose={() => {
            toggleExtractButton()
            setShowMenu(false)
          }}
        />
      )}
    </>
  )
}

export default HoverButton