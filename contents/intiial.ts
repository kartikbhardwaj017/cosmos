// export type UserActionType{
//   elementName: string;
//   elementValue: string;
//   action: 'click'|'type'|'new_tab'|'tab_switch'|'key_press';
//   elementXPath: string;
// }

// document.addEventListener("mouseover", function (e) {
//   // Remove the class from any previously hovered element
//   const previousHovered = document.querySelector(".hover-only-this")
//   if (previousHovered) {
//     previousHovered.classList.remove("hover-only-this")
//   }

//   // Add the class to the current element being hovered
//   if (e.target) {
//     e.target.classList.add("hover-only-this")
//   }
// })

// // Inject CSS for the .hover-only-this class
// const style = document.createElement("style")
// style.type = "text/css"
// style.innerHTML = `.hover-only-this { border: 1px solid #000; }` // Adjust the border style as needed
// document.head.appendChild(style)

document.addEventListener("mouseover", function (e) {
  // Remove the class and tooltip from any previously hovered element
  const previousHovered = document.querySelector(".hover-only-this")
  if (previousHovered) {
    previousHovered.classList.remove("hover-only-this")
    const oldTooltip = document.querySelector(".xpath-tooltip")
    if (oldTooltip) {
      oldTooltip.remove()
    }
  }

  // Add the class to the current element being hovered
  if (e.target) {
    e.target.classList.add("hover-only-this")

    // Create and show the tooltip with the XPath
    const tooltip = document.createElement("div")
    tooltip.className = "xpath-tooltip"
    tooltip.textContent = getElementXPath(e.target) // Assuming getElementXPath is defined elsewhere
    document.body.appendChild(tooltip)

    // Position the tooltip near the element
    const rect = e.target.getBoundingClientRect()
    tooltip.style.left = `${rect.right + window.scrollX}px`
    tooltip.style.top = `${rect.top + window.scrollY}px`
  }
})

// Inject CSS for the .hover-only-this class and the tooltip
const style = document.createElement("style")
style.type = "text/css"
style.innerHTML = `
.hover-only-this { border: 1px solid #000; } /* Adjust the border style as needed */
.xpath-tooltip {
    position: absolute;
    padding: 2px 5px;
    background: #fff;
    border: 1px solid #000;
    font-size: 12px;
    pointer-events: none; /* Allows mouse events to pass through the tooltip */
    z-index: 10000;
}
` // Add more styles for the tooltip as needed
document.head.appendChild(style)

function getElementXPath(element) {
  if (element.id) return 'id("' + element.id + '")'
  if (element === document.body) return element.tagName

  let ix = 0
  const siblings = element.parentNode.childNodes
  for (let i = 0; i < siblings.length; i++) {
    const sibling = siblings[i]
    if (sibling === element)
      return (
        getElementXPath(element.parentNode) +
        "/" +
        element.tagName +
        "[" +
        (ix + 1) +
        "]"
      )
    if (sibling.nodeType === 1 && sibling.tagName === element.tagName) ix++
  }
}

// Utility function to extract descriptive text from an element
function getElementDescription(element) {
  // Try to get text directly from the element or its children
  let text = element.innerText || element.value || ""
  text = text.trim().substring(0, 50) // Limit text length to avoid overly long descriptions

  if (!text) {
    // If no text is found, attempt to get the text from the first child element
    const children = Array.from(element.children)
    const firstChildText =
      children.length > 0
        ? children[0].innerText || children[0].value || ""
        : ""
    text = firstChildText.trim().substring(0, 50) // Again, limit text length
  }

  return text
}

function logAction(actionType: string, details: object) {
  chrome.runtime.sendMessage(
    { action: "logEvent", details: details },
    function (response) {
      console.log(response) // 'success'
    }
  )
  console.log({ action: "logEvent", details: details })
}

document.addEventListener("click", function (e) {
  const xpath = getElementXPath(e.target)
  const description = getElementDescription(e.target)
  logAction("click", { xpath: xpath, description: description })
  chrome.runtime.sendMessage({
    name: description,
    action: "click",
    elementXPath: xpath
  })
})

// Event handler for keypress events
// document.addEventListener("keydown", function (e) {
//   // Check if the pressed key is Enter or Escape
//   if (e.key === "Enter" || e.key === "Escape") {
//     const key = e.key
//     logAction("keypress", { key: key })
//     chrome.runtime.sendMessage({
//       type: "action",
//       action: "keypress",
//       key: key
//     })
//   }
// })

// Event handler for tab switching events
// window.addEventListener("blur", function (e) {
//   const eventType = "tabSwitch"
//   logAction(eventType, {})
//   chrome.runtime.sendMessage({
//     type: "action",
//     action: eventType
//   })
// })

// Event handler for new tab opening events
// document.addEventListener("click", function (e) {
//   // Check if the clicked element is a link to open in a new tab
//   if (
//     e.target.tagName === "A" &&
//     e.target.getAttribute("target") === "_blank"
//   ) {
//     const eventType = "newTab"
//     logAction(eventType, {})
//     chrome.runtime.sendMessage({
//       type: "action",
//       action: eventType
//     })
//   }
// })

// Make sure to implement getElementXPath and getElementDescription functions as needed.

document.addEventListener("input", function (e) {
  const xpath = getElementXPath(e.target)
  const description = getElementDescription(e.target)
  logAction("input", {
    xpath: xpath,
    value: e.target.value,
    description: description
  })
  chrome.runtime.sendMessage({
    action: "input",
    description: description,
    elementName: description,
    elementValue: e.target.value,
    elementXPath: xpath
  })
})

export {}
