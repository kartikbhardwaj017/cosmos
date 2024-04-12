// import "google-closure-library"

import { finder } from "@medv/finder"

// goog.global = window

// goog.require("goog.debug")
// goog.require("goog.dom")
// goog.require("goog.dom.DomHelper")

// var _d = goog.dom.DomHelper
// Object.defineProperty(goog.dom, "DomHelper", {
//   get: function () {
//     return _d
//   },

//   set: function (_value) {
//     // disallow setting of the DomHelper as it will be voided
//     //_d = value;
//   }
// })

export var bot = {}
// goog.require("bot")
// goog.require("bot.action")
// goog.require("bot.events")
// goog.require("bot.locators")
// goog.require("bot.inject")
// goog.require("bot.inject.cache")
// goog.require("bot.userAgent")
// goog.require("bot.Keyboard")
bot.getWindow = function () {
  return bot.window_
}
bot.setWindow = function (win) {
  bot.window_ = win
}
bot.getDocument = function () {
  return bot.window_.document
}

export var core = {}
// goog.require("core.firefox")
// goog.require("core.events")
// goog.require("core.text")
// goog.require("core.locators")

function parse_locator(locator, silent = false) {
  if (!locator) {
    throw new TypeError("Locator cannot be empty")
  }
  const result = locator.match(/^([A-Za-z]+)=.+/)
  if (result) {
    let type = result[1]
    const length = type.length
    if (type === "link") {
      // deprecation control
      browser.runtime.sendMessage({
        log: {
          type: "warn",
          message:
            "link locators are deprecated in favor of linkText and partialLinkText, link is treated as linkText"
        }
      })
      type = "linkText"
    }
    const actualLocator = locator.substring(length + 1)
    return { type: type, string: actualLocator }
  }
  const implicitType = locator.indexOf("//") === -1 ? "id" : "xpath"
  if (!silent) {
    browser.runtime.sendMessage({
      log: {
        type: "warn",
        message: `implicit locators are deprecated, please change the locator to ${implicitType}=${locator}`
      }
    })
  }
  return { type: implicitType, string: locator }
}

function eventIsTrusted(event) {
  return event.isTrusted
}

function LocatorBuilders(window) {
  this.window = window
}

LocatorBuilders.prototype.detach = function () {}

LocatorBuilders.prototype.buildWith = function (name, e, opt_contextNode) {
  return LocatorBuilders.builderMap[name].call(this, e, opt_contextNode)
}

LocatorBuilders.prototype.elementEquals = function (name, e, locator) {
  let fe = this.findElement(locator)
  //TODO: add match function to the ui locator builder, note the inverted parameters
  return (
    e == fe ||
    (LocatorBuilders.builderMap[name] &&
      LocatorBuilders.builderMap[name].match &&
      LocatorBuilders.builderMap[name].match(e, fe))
  )
}

LocatorBuilders.prototype.build = function (e) {
  let locators = this.buildAll(e)
  if (locators.length > 0) {
    return locators[0][0]
  } else {
    return "LOCATOR_DETECTION_FAILED"
  }
}

LocatorBuilders.prototype.buildAll = function (el) {
  let e = el //Samit: Fix: Do the magic to get it to work in Firefox 4
  let locator
  let locators = []
  for (let i = 0; i < LocatorBuilders.order.length; i++) {
    let finderName = LocatorBuilders.order[i]
    try {
      locator = this.buildWith(finderName, e)
      if (locator) {
        locator = String(locator)
        //Samit: The following is a quickfix for above commented code to stop exceptions on almost every locator builder
        //TODO: the builderName should NOT be used as a strategy name, create a feature to allow locatorBuilders to specify this kind of behaviour
        //TODO: Useful if a builder wants to capture a different element like a parent. Use the this.elementEquals
        let fe = this.findElement(locator)
        if (e == fe) {
          locators.push([locator, finderName])
        }
      }
    } catch (e) {
      // TODO ignore the buggy locator builder for now
      //this.log.debug("locator exception: " + e);
    }
  }
  return locators
}

LocatorBuilders.prototype.findElement = function (loc) {
  try {
    const locator = parse_locator(loc, true)
    return bot.locators.findElement(
      { [locator.type]: locator.string },
      this.window.document
    )
  } catch (error) {
    //this.log.debug("findElement failed: " + error + ", locator=" + locator);
    return null
  }
}

/*
 * Class methods
 */

LocatorBuilders.order = []
LocatorBuilders.builderMap = {}
LocatorBuilders._preferredOrder = []
// NOTE: for some reasons we does not use this part
// classObservable(LocatorBuilders);

LocatorBuilders.add = function (name, finder) {
  this.order.push(name)
  this.builderMap[name] = finder
  this._orderChanged()
}

/**
 * Call when the order or preferred order changes
 */
LocatorBuilders._orderChanged = function () {
  let changed = this._ensureAllPresent(this.order, this._preferredOrder)
  this._sortByRefOrder(this.order, this._preferredOrder)
  if (changed) {
    // NOTE: for some reasons we does not use this part
    // this.notify('preferredOrderChanged', this._preferredOrder);
  }
}

/**
 * Set the preferred order of the locator builders
 *
 * @param preferredOrder can be an array or a comma separated string of names
 */
LocatorBuilders.setPreferredOrder = function (preferredOrder) {
  if (typeof preferredOrder === "string") {
    this._preferredOrder = preferredOrder.split(",")
  } else {
    this._preferredOrder = preferredOrder
  }
  this._orderChanged()
}

/**
 * Returns the locator builders preferred order as an array
 */
LocatorBuilders.getPreferredOrder = function () {
  return this._preferredOrder
}

/**
 * Sorts arrayToSort in the order of elements in sortOrderReference
 * @param arrayToSort
 * @param sortOrderReference
 */
LocatorBuilders._sortByRefOrder = function (arrayToSort, sortOrderReference) {
  let raLen = sortOrderReference.length
  arrayToSort.sort(function (a, b) {
    let ai = sortOrderReference.indexOf(a)
    let bi = sortOrderReference.indexOf(b)
    return (ai > -1 ? ai : raLen) - (bi > -1 ? bi : raLen)
  })
}

/**
 * Function to add to the bottom of destArray elements from source array that do not exist in destArray
 * @param sourceArray
 * @param destArray
 */
LocatorBuilders._ensureAllPresent = function (sourceArray, destArray) {
  let changed = false
  sourceArray.forEach(function (e) {
    if (destArray.indexOf(e) == -1) {
      destArray.push(e)
      changed = true
    }
  })
  return changed
}

/*
 * Utility function: Encode XPath attribute value.
 */
LocatorBuilders.prototype.attributeValue = function (value) {
  if (value.indexOf("'") < 0) {
    return "'" + value + "'"
  } else if (value.indexOf('"') < 0) {
    return '"' + value + '"'
  } else {
    let result = "concat("
    let part = ""
    let didReachEndOfValue = false
    while (!didReachEndOfValue) {
      let apos = value.indexOf("'")
      let quot = value.indexOf('"')
      if (apos < 0) {
        result += "'" + value + "'"
        didReachEndOfValue = true
        break
      } else if (quot < 0) {
        result += '"' + value + '"'
        didReachEndOfValue = true
        break
      } else if (quot < apos) {
        part = value.substring(0, apos)
        result += "'" + part + "'"
        value = value.substring(part.length)
      } else {
        part = value.substring(0, quot)
        result += '"' + part + '"'
        value = value.substring(part.length)
      }
      result += ","
    }
    result += ")"
    return result
  }
}

LocatorBuilders.prototype.xpathHtmlElement = function (name) {
  if (this.window.document.contentType == "application/xhtml+xml") {
    // "x:" prefix is required when testing XHTML pages
    return "x:" + name
  } else {
    return name
  }
}

LocatorBuilders.prototype.relativeXPathFromParent = function (current) {
  let index = this.getNodeNbr(current)
  let currentPath = "/" + this.xpathHtmlElement(current.nodeName.toLowerCase())
  if (index > 0) {
    currentPath += "[" + (index + 1) + "]"
  }
  return currentPath
}

LocatorBuilders.prototype.getNodeNbr = function (current) {
  let childNodes = current.parentNode.childNodes
  let total = 0
  let index = -1
  for (let i = 0; i < childNodes.length; i++) {
    let child = childNodes[i]
    if (child.nodeName == current.nodeName) {
      if (child == current) {
        index = total
      }
      total++
    }
  }
  return index
}

LocatorBuilders.prototype.preciseXPath = function (xpath, e) {
  //only create more precise xpath if needed
  if (this.findElement(xpath) != e) {
    let result = e.ownerDocument.evaluate(
      xpath,
      e.ownerDocument,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    )
    //skip first element (result:0 xpath index:1)
    for (let i = 0, len = result.snapshotLength; i < len; i++) {
      let newPath = "xpath=(" + xpath + ")[" + (i + 1) + "]"
      if (this.findElement(newPath) == e) {
        return newPath
      }
    }
  }
  return "xpath=" + xpath
}

/*
 * ===== builders =====
 */

// order listed dictates priority
// e.g., 1st listed is top priority

LocatorBuilders.add("css:data-attr", function cssDataAttr(e) {
  const dataAttributes = ["data-test", "data-test-id"]
  for (let i = 0; i < dataAttributes.length; i++) {
    const attr = dataAttributes[i]
    const value = e.getAttribute(attr)
    if (attr) {
      return `css=*[${attr}="${value}"]`
    }
  }
  return null
})

LocatorBuilders.add("id", function id(e) {
  if (e.id) {
    return "id=" + e.id
  }
  return null
})

LocatorBuilders.add("linkText", function linkText(e) {
  if (e.nodeName == "A") {
    let text = e.textContent
    if (!text.match(/^\s*$/)) {
      return (
        "linkText=" + text.replace(/\xA0/g, " ").replace(/^\s*(.*?)\s*$/, "$1")
      )
    }
  }
  return null
})

LocatorBuilders.add("name", function name(e) {
  if (e.name) {
    return "name=" + e.name
  }
  return null
})

LocatorBuilders.add("css:finder", function cssFinder(e) {
  return "css=" + finder(e)
})

LocatorBuilders.add("xpath:link", function xpathLink(e) {
  if (e.nodeName == "A") {
    let text = e.textContent
    if (!text.match(/^\s*$/)) {
      return this.preciseXPath(
        "//" +
          this.xpathHtmlElement("a") +
          "[contains(text(),'" +
          text.replace(/^\s+/, "").replace(/\s+$/, "") +
          "')]",
        e
      )
    }
  }
  return null
})

LocatorBuilders.add("xpath:img", function xpathImg(e) {
  if (e.nodeName == "IMG") {
    if (e.alt != "") {
      return this.preciseXPath(
        "//" +
          this.xpathHtmlElement("img") +
          "[@alt=" +
          this.attributeValue(e.alt) +
          "]",
        e
      )
    } else if (e.title != "") {
      return this.preciseXPath(
        "//" +
          this.xpathHtmlElement("img") +
          "[@title=" +
          this.attributeValue(e.title) +
          "]",
        e
      )
    } else if (e.src != "") {
      return this.preciseXPath(
        "//" +
          this.xpathHtmlElement("img") +
          "[contains(@src," +
          this.attributeValue(e.src) +
          ")]",
        e
      )
    }
  }
  return null
})

LocatorBuilders.add("xpath:attributes", function xpathAttr(e) {
  const PREFERRED_ATTRIBUTES = [
    "id",
    "name",
    "value",
    "type",
    "action",
    "onclick"
  ]
  let i = 0

  function attributesXPath(name, attNames, attributes) {
    let locator = "//" + this.xpathHtmlElement(name) + "["
    for (i = 0; i < attNames.length; i++) {
      if (i > 0) {
        locator += " and "
      }
      let attName = attNames[i]
      locator += "@" + attName + "=" + this.attributeValue(attributes[attName])
    }
    locator += "]"
    return this.preciseXPath(locator, e)
  }

  if (e.attributes) {
    let atts = e.attributes
    let attsMap = {}
    for (i = 0; i < atts.length; i++) {
      let att = atts[i]
      attsMap[att.name] = att.value
    }
    let names = []
    // try preferred attributes
    for (i = 0; i < PREFERRED_ATTRIBUTES.length; i++) {
      let name = PREFERRED_ATTRIBUTES[i]
      if (attsMap[name] != null) {
        names.push(name)
        let locator = attributesXPath.call(
          this,
          e.nodeName.toLowerCase(),
          names,
          attsMap
        )
        if (e == this.findElement(locator)) {
          return locator
        }
      }
    }
  }
  return null
})

LocatorBuilders.add("xpath:idRelative", function xpathIdRelative(e) {
  let path = ""
  let current = e
  while (current != null) {
    if (current.parentNode != null) {
      path = this.relativeXPathFromParent(current) + path
      if (
        1 == current.parentNode.nodeType && // ELEMENT_NODE
        current.parentNode.getAttribute("id")
      ) {
        return this.preciseXPath(
          "//" +
            this.xpathHtmlElement(current.parentNode.nodeName.toLowerCase()) +
            "[@id=" +
            this.attributeValue(current.parentNode.getAttribute("id")) +
            "]" +
            path,
          e
        )
      }
    } else {
      return null
    }
    current = current.parentNode
  }
  return null
})

LocatorBuilders.add("xpath:href", function xpathHref(e) {
  if (e.attributes && e.hasAttribute("href")) {
    let href = e.getAttribute("href")
    if (href.search(/^http?:\/\//) >= 0) {
      return this.preciseXPath(
        "//" +
          this.xpathHtmlElement("a") +
          "[@href=" +
          this.attributeValue(href) +
          "]",
        e
      )
    } else {
      // use contains(), because in IE getAttribute("href") will return absolute path
      return this.preciseXPath(
        "//" +
          this.xpathHtmlElement("a") +
          "[contains(@href, " +
          this.attributeValue(href) +
          ")]",
        e
      )
    }
  }
  return null
})

LocatorBuilders.add(
  "xpath:position",
  function xpathPosition(e, opt_contextNode) {
    let path = ""
    let current = e
    while (current != null && current != opt_contextNode) {
      let currentPath
      if (current.parentNode != null) {
        currentPath = this.relativeXPathFromParent(current)
      } else {
        currentPath =
          "/" + this.xpathHtmlElement(current.nodeName.toLowerCase())
      }
      path = currentPath + path
      let locator = "/" + path
      if (e == this.findElement(locator)) {
        return "xpath=" + locator
      }
      current = current.parentNode
    }
    return null
  }
)

LocatorBuilders.add("xpath:innerText", function xpathInnerText(el) {
  if (el.innerText) {
    return `xpath=//${el.nodeName.toLowerCase()}[contains(.,'${el.innerText}')]`
  } else {
    return null
  }
})

function Recorder(window: Window) {
  this.window = window
  this.eventListeners = {}
  this.attached = false
  this.recordingState = {}
}

Recorder.eventHandlers = {}
Recorder.mutationObservers = {}

Recorder.addEventHandler = function (
  handlerName,
  eventName,
  handler,
  options?: any
) {
  handler.handlerName = handlerName
  if (!options) options = false
  let key = options ? "C_" + eventName : eventName
  if (!this.eventHandlers[key]) {
    this.eventHandlers[key] = []
  }
  this.eventHandlers[key].push(handler)
}

Recorder.addMutationObserver = function (observerName, callback, config) {
  const observer = new MutationObserver(callback)
  observer.observerName = observerName
  observer.config = config
  this.mutationObservers[observerName] = observer
}

Recorder.prototype.parseEventKey = function (eventKey) {
  if (eventKey.match(/^C_/)) {
    return { eventName: eventKey.substring(2), capture: true }
  } else {
    return { eventName: eventKey, capture: false }
  }
}

Recorder.inputTypes = [
  "text",
  "password",
  "file",
  "datetime",
  "datetime-local",
  "date",
  "month",
  "time",
  "week",
  "number",
  "range",
  "email",
  "url",
  "search",
  "tel",
  "color"
]

function findClickableElement(e) {
  if (!e.tagName) return null
  let tagName = e.tagName.toLowerCase()
  let type = e.type
  if (
    e.hasAttribute("onclick") ||
    e.hasAttribute("href") ||
    tagName == "button" ||
    (tagName == "input" &&
      (type == "submit" ||
        type == "button" ||
        type == "image" ||
        type == "radio" ||
        type == "checkbox" ||
        type == "reset"))
  ) {
    return e
  } else {
    if (e.parentNode != null) {
      return findClickableElement(e.parentNode)
    } else {
      return null
    }
  }
}

function getOptionLocator(option) {
  let label = option.text.replace(/^ *(.*?) *$/, "$1")
  if (label.match(/\xA0/)) {
    // if the text contains &nbsp;
    return (
      "label=regexp:" +
      label
        .replace(/[(\)\[\]\\\^\$\*\+\?\.\|\{\}]/g, function (str) {
          // eslint-disable-line no-useless-escape
          return "\\" + str
        })
        .replace(/\s+/g, function (str) {
          if (str.match(/\xA0/)) {
            if (str.length > 1) {
              return "\\s+"
            } else {
              return "\\s"
            }
          } else {
            return str
          }
        })
    )
  } else {
    return "label=" + label
  }
}

export const locatorBuilders = new LocatorBuilders(window)

Recorder.addEventHandler("type", "change", function (event) {
  // © Chen-Chieh Ping, SideeX Team
  if (
    event.target.tagName &&
    !this.recordingState.preventType &&
    this.recordingState.typeLock == 0 &&
    (this.recordingState.typeLock = 1)
  ) {
    // END
    let tagName = event.target.tagName.toLowerCase()
    let type = event.target.type
    if ("input" == tagName && Recorder.inputTypes.indexOf(type) >= 0) {
      if (event.target.value.length > 0) {
        record(
          "type",
          locatorBuilders.buildAll(event.target),
          event.target.value
        )

        // © Chen-Chieh Ping, SideeX Team
        if (this.recordingState.enterTarget != null) {
          let tempTarget = event.target.parentElement
          let formChk = tempTarget.tagName.toLowerCase()
          while (formChk != "form" && formChk != "body") {
            tempTarget = tempTarget.parentElement
            formChk = tempTarget.tagName.toLowerCase()
          }

          record(
            "sendKeys",
            locatorBuilders.buildAll(this.recordingState.enterTarget),
            "${KEY_ENTER}"
          )
          this.recordingState.enterTarget = null
        }
        // END
      } else {
        record(
          "type",
          locatorBuilders.buildAll(event.target),
          event.target.value
        )
      }
    } else if ("textarea" == tagName) {
      record("type", locatorBuilders.buildAll(event.target), event.target.value)
    }
  }
  this.recordingState.typeLock = 0
})

Recorder.addEventHandler("type", "input", function (event) {
  this.recordingState.typeTarget = event.target
})

Recorder.addEventHandler(
  "clickAt",
  "click",
  function (event) {
    if (
      event.button == 0 &&
      !this.recordingState.preventClick &&
      eventIsTrusted(event)
    ) {
      if (!this.recordingState.preventClickTwice) {
        record("click", locatorBuilders.buildAll(event.target), "")
        this.recordingState.preventClickTwice = true
      }
      setTimeout(() => {
        this.recordingState.preventClickTwice = false
      }, 30)
    }
  },
  true
)

Recorder.addEventHandler(
  "doubleClickAt",
  "dblclick",
  function (event) {
    record("doubleClick", locatorBuilders.buildAll(event.target), "")
  },
  true
)

Recorder.addEventHandler(
  "sendKeys",
  "keydown",
  function (event) {
    if (event.target.tagName) {
      let key = event.keyCode
      let tagName = event.target.tagName.toLowerCase()
      let type = event.target.type
      if (tagName == "input" && Recorder.inputTypes.indexOf(type) >= 0) {
        if (key == 13) {
          this.recordingState.enterTarget = event.target
          this.recordingState.enterValue = this.recordingState.enterTarget.value
          let tempTarget = event.target.parentElement
          let formChk = tempTarget.tagName.toLowerCase()
          if (
            this.recordingState.tempValue ==
              this.recordingState.enterTarget.value &&
            this.recordingState.tabCheck == this.recordingState.enterTarget
          ) {
            record(
              "sendKeys",
              locatorBuilders.buildAll(this.recordingState.enterTarget),
              "${KEY_ENTER}"
            )
            this.recordingState.enterTarget = null
            this.recordingState.preventType = true
          } else if (
            this.recordingState.focusValue == this.recordingState.enterValue
          ) {
            while (formChk != "form" && formChk != "body") {
              tempTarget = tempTarget.parentElement
              formChk = tempTarget.tagName.toLowerCase()
            }
            record(
              "sendKeys",
              locatorBuilders.buildAll(this.recordingState.enterTarget),
              "${KEY_ENTER}"
            )
            this.recordingState.enterTarget = null
          }
          if (
            this.recordingState.typeTarget &&
            this.recordingState.typeTarget.tagName &&
            !this.recordingState.preventType &&
            (this.recordingState.typeLock = 1)
          ) {
            // END
            tagName = this.recordingState.typeTarget.tagName.toLowerCase()
            type = this.recordingState.typeTarget.type
            if ("input" == tagName && Recorder.inputTypes.indexOf(type) >= 0) {
              if (this.recordingState.typeTarget.value.length > 0) {
                record(
                  "type",
                  locatorBuilders.buildAll(this.recordingState.typeTarget),
                  this.recordingState.typeTarget.value
                )

                // © Chen-Chieh Ping, SideeX Team
                if (this.recordingState.enterTarget != null) {
                  tempTarget = this.recordingState.typeTarget.parentElement
                  formChk = tempTarget.tagName.toLowerCase()
                  while (formChk != "form" && formChk != "body") {
                    tempTarget = tempTarget.parentElement
                    formChk = tempTarget.tagName.toLowerCase()
                  }
                  record(
                    "sendKeys",
                    locatorBuilders.buildAll(this.recordingState.enterTarget),
                    "${KEY_ENTER}"
                  )
                  this.recordingState.enterTarget = null
                }
                // END
              } else {
                record(
                  "type",
                  locatorBuilders.buildAll(this.recordingState.typeTarget),
                  this.recordingState.typeTarget.value
                )
              }
            } else if ("textarea" == tagName) {
              record(
                "type",
                locatorBuilders.buildAll(this.recordingState.typeTarget),
                this.recordingState.typeTarget.value
              )
            }
          }
          this.recordingState.preventClick = true
          setTimeout(() => {
            this.recordingState.preventClick = false
          }, 500)
          setTimeout(() => {
            if (this.recordingState.enterValue != event.target.value)
              this.recordingState.enterTarget = null
          }, 50)
        }

        let tempbool = false
        if ((key == 38 || key == 40) && event.target.value != "") {
          if (
            this.recordingState.focusTarget != null &&
            this.recordingState.focusTarget.value !=
              this.recordingState.tempValue
          ) {
            tempbool = true
            this.recordingState.tempValue =
              this.recordingState.focusTarget.value
          }
          if (tempbool) {
            record(
              "type",
              locatorBuilders.buildAll(event.target),
              this.recordingState.tempValue
            )
          }

          setTimeout(() => {
            this.recordingState.tempValue =
              this.recordingState.focusTarget.value
          }, 250)

          if (key == 38)
            record(
              "sendKeys",
              locatorBuilders.buildAll(event.target),
              "${KEY_UP}"
            )
          else
            record(
              "sendKeys",
              locatorBuilders.buildAll(event.target),
              "${KEY_DOWN}"
            )
          this.recordingState.tabCheck = event.target
        }
        if (key == 9) {
          if (this.recordingState.tabCheck == event.target) {
            record(
              "sendKeys",
              locatorBuilders.buildAll(event.target),
              "${KEY_TAB}"
            )
            this.recordingState.preventType = true
          }
        }
      }
    }
  },
  true
)

let mousedown, mouseup, selectMouseup, selectMousedown, mouseoverQ, clickLocator

Recorder.addEventHandler(
  "dragAndDrop",
  "mousedown",
  function (event) {
    mousedown = undefined
    selectMousedown = undefined
    if (
      event.clientX < window.document.documentElement.clientWidth &&
      event.clientY < window.document.documentElement.clientHeight
    ) {
      mousedown = event
      mouseup = setTimeout(() => {
        mousedown = undefined
      }, 200)

      selectMouseup = setTimeout(() => {
        selectMousedown = event
      }, 200)
    }
    mouseoverQ = []

    if (event.target.nodeName) {
      let tagName = event.target.nodeName.toLowerCase()
      if ("option" == tagName) {
        let parent = event.target.parentNode
        if (parent.multiple) {
          let options = parent.options
          for (let i = 0; i < options.length; i++) {
            options[i]._wasSelected = options[i].selected
          }
        }
      }
    }
  },
  true
)
// END

// © Shuo-Heng Shih, SideeX Team
Recorder.addEventHandler(
  "dragAndDrop",
  "mouseup",
  function (event) {
    function getSelectionText() {
      let text = ""
      let activeEl = window.document.activeElement
      let activeElTagName = activeEl ? activeEl.tagName.toLowerCase() : null
      if (activeElTagName == "textarea" || activeElTagName == "input") {
        text = activeEl.value.slice(
          activeEl.selectionStart,
          activeEl.selectionEnd
        )
      } else if (window.getSelection) {
        text = window.getSelection().toString()
      }
      return text.trim()
    }
    clearTimeout(selectMouseup)
    if (selectMousedown) {
      let x = event.clientX - selectMousedown.clientX
      let y = event.clientY - selectMousedown.clientY

      if (
        selectMousedown &&
        event.button === 0 &&
        x + y &&
        event.clientX < window.document.documentElement.clientWidth &&
        event.clientY < window.document.documentElement.clientHeight &&
        getSelectionText() === ""
      ) {
        let sourceRelateX =
          selectMousedown.pageX -
          selectMousedown.target.getBoundingClientRect().left -
          window.scrollX
        let sourceRelateY =
          selectMousedown.pageY -
          selectMousedown.target.getBoundingClientRect().top -
          window.scrollY
        let targetRelateX, targetRelateY
        if (
          !!mouseoverQ.length &&
          mouseoverQ[1].relatedTarget == mouseoverQ[0].target &&
          mouseoverQ[0].target == event.target
        ) {
          targetRelateX =
            event.pageX -
            mouseoverQ[1].target.getBoundingClientRect().left -
            window.scrollX
          targetRelateY =
            event.pageY -
            mouseoverQ[1].target.getBoundingClientRect().top -
            window.scrollY
          record(
            "mouseDownAt",
            locatorBuilders.buildAll(selectMousedown.target),
            sourceRelateX + "," + sourceRelateY
          )
          record(
            "mouseMoveAt",
            locatorBuilders.buildAll(mouseoverQ[1].target),
            targetRelateX + "," + targetRelateY
          )
          record(
            "mouseUpAt",
            locatorBuilders.buildAll(mouseoverQ[1].target),
            targetRelateX + "," + targetRelateY
          )
        } else {
          targetRelateX =
            event.pageX -
            event.target.getBoundingClientRect().left -
            window.scrollX
          targetRelateY =
            event.pageY -
            event.target.getBoundingClientRect().top -
            window.scrollY
          record(
            "mouseDownAt",
            locatorBuilders.buildAll(event.target),
            targetRelateX + "," + targetRelateY
          )
          record(
            "mouseMoveAt",
            locatorBuilders.buildAll(event.target),
            targetRelateX + "," + targetRelateY
          )
          record(
            "mouseUpAt",
            locatorBuilders.buildAll(event.target),
            targetRelateX + "," + targetRelateY
          )
        }
      }
    } else {
      clickLocator = undefined
      mouseup = undefined
      let x = 0
      let y = 0
      if (mousedown) {
        x = event.clientX - mousedown.clientX
        y = event.clientY - mousedown.clientY
      }

      if (mousedown && mousedown.target !== event.target && !(x + y)) {
        record("mouseDown", locatorBuilders.buildAll(mousedown.target), "")
        record("mouseUp", locatorBuilders.buildAll(event.target), "")
      } else if (mousedown && mousedown.target === event.target) {
        let target = locatorBuilders.buildAll(mousedown.target)
        // setTimeout(function() {
        //     if (!self.clickLocator)
        //         record("click", target, '');
        // }.bind(this), 100);
      }
    }
    mousedown = undefined
    selectMousedown = undefined
    mouseoverQ = undefined
  },
  true
)
// END

let dropLocator, dragstartLocator
// © Shuo-Heng Shih, SideeX Team
Recorder.addEventHandler(
  "dragAndDropToObject",
  "dragstart",
  function (event) {
    dropLocator = setTimeout(() => {
      dragstartLocator = event
    }, 200)
  },
  true
)
// END

// © Shuo-Heng Shih, SideeX Team
Recorder.addEventHandler(
  "dragAndDropToObject",
  "drop",
  function (event) {
    clearTimeout(dropLocator)
    if (
      dragstartLocator &&
      event.button == 0 &&
      dragstartLocator.target !== event.target
    ) {
      //value no option
      record(
        "dragAndDropToObject",
        locatorBuilders.buildAll(dragstartLocator.target),
        locatorBuilders.build(event.target)
      )
    }
    dragstartLocator = undefined
    selectMousedown = undefined
  },
  true
)
// END

// © Shuo-Heng Shih, SideeX Team
let prevTimeOut = null,
  scrollDetector
Recorder.addEventHandler(
  "runScript",
  "scroll",
  function (event) {
    if (pageLoaded === true) {
      scrollDetector = event.target
      clearTimeout(prevTimeOut)
      prevTimeOut = setTimeout(() => {
        scrollDetector = undefined
      }, 500)
    }
  },
  true
)
// END

// © Shuo-Heng Shih, SideeX Team
let nowNode = 0,
  mouseoverLocator,
  nodeInsertedLocator,
  nodeInsertedAttrChange
Recorder.addEventHandler(
  "mouseOver",
  "mouseover",
  function (event) {
    if (window.document.documentElement)
      nowNode = window.document.documentElement.getElementsByTagName("*").length
    if (pageLoaded === true) {
      let clickable = findClickableElement(event.target)
      if (clickable) {
        nodeInsertedLocator = event.target
        nodeInsertedAttrChange = locatorBuilders.buildAll(event.target)
        setTimeout(() => {
          nodeInsertedLocator = undefined
          nodeInsertedAttrChange = undefined
        }, 500)
      }
      //drop target overlapping
      if (mouseoverQ) {
        //mouse keep down
        if (mouseoverQ.length >= 3) mouseoverQ.shift()
        mouseoverQ.push(event)
      }
    }
  },
  true
)
// END

let mouseoutLocator = undefined
// © Shuo-Heng Shih, SideeX Team
Recorder.addEventHandler(
  "mouseOut",
  "mouseout",
  function (event) {
    if (mouseoutLocator !== null && event.target === mouseoutLocator) {
      record("mouseOut", locatorBuilders.buildAll(event.target), "")
    }
    mouseoutLocator = undefined
  },
  true
)
// END

Recorder.addMutationObserver(
  "FrameDeleted",
  function (mutations) {
    mutations.forEach(async (mutation) => {
      const removedNodes = await mutation.removedNodes
      if (
        removedNodes.length &&
        removedNodes[0].nodeName === "IFRAME" &&
        removedNodes[0].id !== "selenium-ide-indicator"
      ) {
        browser.runtime.sendMessage({ frameRemoved: true }).catch(() => {})
      }
    })
  },
  { childList: true }
)

Recorder.addMutationObserver(
  "DOMNodeInserted",
  function (mutations) {
    if (
      pageLoaded === true &&
      window.document.documentElement.getElementsByTagName("*").length > nowNode
    ) {
      // Get list of inserted nodes from the mutations list to simulate 'DOMNodeInserted'.
      const insertedNodes = mutations.reduce((nodes, mutation) => {
        if (mutation.type === "childList") {
          nodes.push.apply(nodes, mutation.addedNodes)
        }
        return nodes
      }, [])
      // If no nodes inserted, just bail.
      if (!insertedNodes.length) {
        return
      }

      if (scrollDetector) {
        //TODO: fix target
        record("runScript", [["window.scrollTo(0," + window.scrollY + ")"]], "")
        pageLoaded = false
        setTimeout(() => {
          pageLoaded = true
        }, 550)
        scrollDetector = undefined
        nodeInsertedLocator = undefined
      }
      if (nodeInsertedLocator) {
        record("mouseOver", nodeInsertedAttrChange, "")
        mouseoutLocator = nodeInsertedLocator
        nodeInsertedLocator = undefined
        nodeInsertedAttrChange = undefined
        mouseoverLocator = undefined
      }
    }
  },
  { childList: true, subtree: true }
)

// © Shuo-Heng Shih, SideeX Team
let readyTimeOut = null
let pageLoaded = true
Recorder.addEventHandler(
  "checkPageLoaded",
  "readystatechange",
  function (event) {
    if (window.document.readyState === "loading") {
      pageLoaded = false
    } else {
      pageLoaded = false
      clearTimeout(readyTimeOut)
      readyTimeOut = setTimeout(() => {
        pageLoaded = true
      }, 1500) //setReady after complete 1.5s
    }
  },
  true
)
// END

// © Ming-Hung Hsu, SideeX Team
Recorder.addEventHandler(
  "contextMenu",
  "contextmenu",
  function (event) {
    let myPort = browser.runtime.connect()
    let tmpTarget = locatorBuilders.buildAll(event.target)
    myPort.onMessage.addListener(function (m) {
      if (m.cmd.includes("Text") || m.cmd.includes("Label")) {
        let tmpText = bot.dom.getVisibleText(event.target)
        record(m.cmd, tmpTarget, tmpText)
      } else if (m.cmd.includes("Title")) {
        let tmpTitle = goog.string.normalizeSpaces(
          event.target.ownerDocument.title
        )
        record(m.cmd, [[tmpTitle]], "")
      } else if (
        m.cmd.includes("Present") ||
        m.cmd.includes("Checked") ||
        m.cmd.includes("Editable") ||
        m.cmd.includes("Selected") ||
        m.cmd.includes("Visible") ||
        m.cmd === "mouseOver"
      ) {
        record(m.cmd, tmpTarget, "")
      } else if (m.cmd.includes("Value")) {
        let tmpValue = event.target.value
        record(m.cmd, tmpTarget, tmpValue)
      }
      myPort.onMessage.removeListener(this)
    })
  },
  true
)
// END

// © Yun-Wen Lin, SideeX Team
let getEle
let checkFocus = 0
let contentTest
Recorder.addEventHandler(
  "editContent",
  "focus",
  function (event) {
    let editable = event.target.contentEditable
    if (editable == "true") {
      getEle = event.target
      contentTest = getEle.innerHTML
      checkFocus = 1
    }
  },
  true
)
// END

// © Yun-Wen Lin, SideeX Team
Recorder.addEventHandler(
  "editContent",
  "blur",
  function (event) {
    if (checkFocus == 1) {
      if (event.target == getEle) {
        if (getEle.innerHTML != contentTest) {
          record(
            "editContent",
            locatorBuilders.buildAll(event.target),
            getEle.innerHTML
          )
        }
        checkFocus = 0
      }
    }
  },
  true
)

Recorder.addEventHandler(
  "select",
  "focus",
  function (event) {
    if (event.target.nodeName) {
      let tagName = event.target.nodeName.toLowerCase()
      if ("select" == tagName && event.target.multiple) {
        let options = event.target.options
        for (let i = 0; i < options.length; i++) {
          if (options[i]._wasSelected == null) {
            // is the focus was gained by mousedown event, _wasSelected would be already set
            options[i]._wasSelected = options[i].selected
          }
        }
      }
    }
  },
  true
)

Recorder.addEventHandler("select", "change", function (event) {
  if (event.target.tagName) {
    let tagName = event.target.tagName.toLowerCase()
    if ("select" == tagName) {
      if (!event.target.multiple) {
        let option = event.target.options[event.target.selectedIndex]
        record(
          "select",
          locatorBuilders.buildAll(event.target),
          getOptionLocator(option)
        )
      } else {
        let options = event.target.options
        for (let i = 0; i < options.length; i++) {
          if (options[i]._wasSelected != options[i].selected) {
            let value = getOptionLocator(options[i])
            if (options[i].selected) {
              record(
                "addSelection",
                locatorBuilders.buildAll(event.target),
                value
              )
            } else {
              record(
                "removeSelection",
                locatorBuilders.buildAll(event.target),
                value
              )
            }
            this.recordingState.preventClickTwice = true
            options[i]._wasSelected = options[i].selected
          }
        }
      }
    }
  }
})

const recorder = new Recorder(window)

function updateInputElementsOfRelevantType(action) {
  let inp = window.document.getElementsByTagName("input")
  for (let i = 0; i < inp.length; i++) {
    if (Recorder.inputTypes.indexOf(inp[i].type) >= 0) {
      action(inp[i])
    }
  }
}

function focusEvent(recordingState, event) {
  recordingState.focusTarget = event.target
  recordingState.focusValue = recordingState.focusTarget.value
  recordingState.tempValue = recordingState.focusValue
  recordingState.preventType = false
}

function blurEvent(recordingState) {
  recordingState.focusTarget = null
  recordingState.focusValue = null
  recordingState.tempValue = null
}

function attachInputListeners(recordingState) {
  updateInputElementsOfRelevantType((input) => {
    input.addEventListener("focus", focusEvent.bind(null, recordingState))
    input.addEventListener("blur", blurEvent.bind(null, recordingState))
  })
}

function detachInputListeners(recordingState) {
  updateInputElementsOfRelevantType((input) => {
    input.removeEventListener("focus", focusEvent.bind(null, recordingState))
    input.removeEventListener("blur", blurEvent.bind(null, recordingState))
  })
}

Recorder.prototype.attach = function () {
  console.log("yyo")

  if (!this.attached) {
    console.log(Recorder.eventHandlers)
    for (let eventKey in Recorder.eventHandlers) {
      const eventInfo = this.parseEventKey(eventKey)
      const eventName = eventInfo.eventName
      const capture = eventInfo.capture

      const handlers = Recorder.eventHandlers[eventKey]
      this.eventListeners[eventKey] = []
      for (let i = 0; i < handlers.length; i++) {
        let handler = handlers[i].bind(this)
        this.window.document.addEventListener(eventName, handler, capture)
        this.eventListeners[eventKey].push(handler)
      }
    }
    for (let observerName in Recorder.mutationObservers) {
      const observer = Recorder.mutationObservers[observerName]
      observer.observe(this.window.document.body, observer.config)
    }
    this.attached = true
    this.recordingState = {
      typeTarget: undefined,
      typeLock: 0,
      focusTarget: null,
      focusValue: null,
      tempValue: null,
      preventType: false,
      preventClickTwice: false,
      preventClick: false,
      enterTarget: null,
      enterValue: null,
      tabCheck: null
    }
    attachInputListeners(this.recordingState)
  }
}

Recorder.prototype.detach = function () {
  for (let eventKey in this.eventListeners) {
    const eventInfo = this.parseEventKey(eventKey)
    const eventName = eventInfo.eventName
    const capture = eventInfo.capture
    for (let i = 0; i < this.eventListeners[eventKey].length; i++) {
      this.window.document.removeEventListener(
        eventName,
        this.eventListeners[eventKey][i],
        capture
      )
    }
  }
  for (let observerName in Recorder.mutationObservers) {
    const observer = Recorder.mutationObservers[observerName]
    observer.disconnect()
  }
  this.eventListeners = {}
  this.attached = false
  detachInputListeners(this.recordingState)
}

// function attachRecorderHandler(message, _sender, sendResponse) {
//   if (message.attachRecorder) {
//     recorder.attach()
//     sendResponse(true)
//   }
// }

// function detachRecorderHandler(message, _sender, sendResponse) {
//   if (message.detachRecorder) {
//     recorder.detach()
//     sendResponse(true)
//   }
// }

// window.recorder = recorder
// window.contentSideexTabId = contentSideexTabId
// window.Recorder = Recorder

export function record(
  command,
  target,
  value,
  insertBeforeLastCommand?: any,
  actualFrameLocation?: any
) {
  console.log({
    command: command,
    target: target,
    value: value,
    insertBeforeLastCommand: insertBeforeLastCommand
    // frameLocation:
    //   actualFrameLocation != undefined ? actualFrameLocation : frameLocation,
    // commandSideexTabId: contentSideexTabId
  })
}

recorder.attach()
console.log("yoyo bro")

// window.record = record
