import { sendToBackground } from "@plasmohq/messaging"
import { useStorage } from "@plasmohq/storage/hook"

const CustomButton = () => {
  const [clickCount, setClickCount] = useStorage<number>("clickCount")

  return (
    <div
      onMouseEnter={(event) => {
        event.target.style.visibility = "hidden"
        setTimeout(function () {
          event.target.style.visibility = "visible"
        }, 1000)
      }}
      style={{
        border: "1px solid #d30100",
        borderRadius: "50px",
        position: "fixed",
        bottom: "36px",
        right: "36px",
        width: "400px",
        height: "50px",
        backgroundColor: "#f7f7f7",
        transition: "bottom 100ms linear",
        boxShadow: "0 7px 10px 0 rgba(0,0,0,0.1)"
      }}>
      Button clicked {clickCount || 0} times <br />
      <button
        onClick={(event) => {
          setClickCount(clickCount + 1)
        }}>
        local counter
      </button>
      <button
        onClick={async (event) => {
          let res = await sendToBackground({
            body: {
              message: "Hello"
            },
            name: "ping",
            extensionId: "obcbegnflkleciggjgpbjcfehjeeplcj"
          })
          console.log(res)
        }}>
        send message
      </button>
    </div>
  )
}

export default CustomButton
