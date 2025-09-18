// Unified frontend client for NOVA-R: chat + uploads + theme

document.addEventListener("DOMContentLoaded", () => {
  const sendBtn = document.getElementById("send-btn");
  const chatInput = document.getElementById("chat-input");
  const chatWindow = document.getElementById("chat-window");
  const docUpload = document.getElementById("doc-upload");
  const docMsg = document.getElementById("doc-limit-msg");
  const guestBtn = document.getElementById("guest-btn");
  const themeBtn = document.getElementById("theme-toggle");

  let docCount = 0;
  const maxDocs = 5;

  // Theme toggle
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      document.body.classList.toggle("dark-theme");
      document.body.classList.toggle("light-theme");
      themeBtn.textContent = document.body.classList.contains("dark-theme") ? "☀️ Light Mode" : "🌙 Dark Mode";
    });
  }

  // Guest button navigates to chat UI
  if (guestBtn) {
    guestBtn.addEventListener("click", () => {
      window.location.href = "/chat";
    });
  }

  // Helper: Append messages to chat window
  function appendMessage(text, who = "ai") {
    const el = document.createElement("div");
    el.className = `chat-msg ${who}`;
    el.innerHTML = text;
    chatWindow.appendChild(el);
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }

  // Send message to /chat/ask
  async function sendMessage(message) {
    appendMessage(`You: ${escapeHtml(message)}`, "user");

    try {
      const res = await fetch("/chat/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message })
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Server error: ${res.status} ${txt}`);
      }

      const data = await res.json();
      appendMessage(`NOVA-R: ${escapeHtml(data.response)}`, "ai");
    } catch (err) {
      console.error(err);
      appendMessage(`Error: ${escapeHtml(err.message)}`, "ai");
    }
  }

  // Upload files to /chat/upload
  async function uploadFiles(files) {
    const form = new FormData();
    for (let f of files) form.append("file", f);

    try {
      const res = await fetch("/chat/upload", {
        method: "POST",
        body: form
      });
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      const data = await res.json();
      docCount += files.length;
      docMsg.textContent = data.message || `${docCount}/${maxDocs} documents uploaded.`;
    } catch (err) {
      console.error(err);
      docMsg.textContent = `Upload error: ${err.message}`;
    }
  }

  // Escape simple HTML to avoid injection
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Event: send
  if (sendBtn) {
    sendBtn.addEventListener("click", () => {
      const msg = chatInput.value.trim();
      if (!msg) return;
      chatInput.value = "";
      sendMessage(msg);
    });
  }

  // Enter to send
  if (chatInput) {
    chatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        sendBtn.click();
      }
    });
  }

  // Handle file selection
  if (docUpload) {
    docUpload.addEventListener("change", (e) => {
      const files = Array.from(e.target.files || []);
      if (docCount + files.length > maxDocs) {
        docMsg.textContent = `❌ You can only upload ${maxDocs} docs per session.`;
        e.target.value = "";
        return;
      }
      uploadFiles(files);
      // clear selection
      e.target.value = "";
    });
  }
});
