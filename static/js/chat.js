let docCount = 0;
const maxDocs = 5;
let uploadedDocs = [];

document.addEventListener("DOMContentLoaded", () => {
  const sendBtn = document.getElementById("send-btn");
  const chatInput = document.getElementById("chat-input");
  const chatWindow = document.getElementById("chat-window");
  const docUpload = document.getElementById("doc-upload");
  const docMsg = document.getElementById("doc-limit-msg");

  // --- Send message to backend ---
  async function sendMessage(message) {
    try {
      const res = await fetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message,
          files: uploadedDocs // send docs if any
        })
      });

      const data = await res.json();

      // Backend already formats markdown → HTML
      const aiElem = document.createElement("div");
      aiElem.className = "chat-msg ai";
      aiElem.innerHTML = "NOVA-R: " + data.response;
      chatWindow.appendChild(aiElem);

      chatWindow.scrollTop = chatWindow.scrollHeight;
    } catch (err) {
      console.error("Chat error:", err);
    }
  }

  // --- Handle send button ---
  sendBtn.addEventListener("click", () => {
    const msg = chatInput.value.trim();
    if (!msg) return;

    const msgElem = document.createElement("div");
    msgElem.className = "chat-msg user";
    msgElem.textContent = "You: " + msg;
    chatWindow.appendChild(msgElem);

    chatInput.value = "";
    sendMessage(msg);
  });

  // --- Handle doc uploads ---
  docUpload.addEventListener("change", async (e) => {
    if (docCount + e.target.files.length > maxDocs) {
      docMsg.textContent = `❌ You can only upload ${maxDocs} docs per session.`;
      e.target.value = "";
      return;
    }

    const files = e.target.files;
    for (let file of files) {
      const base64 = await toBase64(file);
      uploadedDocs.push({
        name: file.name,
        type: file.type,
        data: base64
      });
    }

    docCount += files.length;
    docMsg.textContent = `📄 ${docCount}/${maxDocs} documents uploaded.`;
  });

  // --- Helper: Convert file to Base64 ---
  function toBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
    });
  }
});
