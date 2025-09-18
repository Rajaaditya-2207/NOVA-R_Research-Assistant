// Enhanced frontend client for NOVA-R chat UI
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');
  const chatWindow = document.getElementById('chat-window');
  const fileInput = document.getElementById('doc-upload');
  const statusMsg = document.getElementById('status-msg');
  const docMsg = document.getElementById('doc-limit-msg');

  let isWaiting = false;
  const maxDocs = 5;
  let uploadedCount = 0;

  function setStatus(s){ if(statusMsg) statusMsg.textContent = s }

  function renderBubble(text, who='ai'){
    const el = document.createElement('div');
    el.className = 'bubble ' + (who==='user' ? 'user' : 'ai');
    el.innerHTML = markdownLite(escapeHtml(text));
    chatWindow.appendChild(el);
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }

  function markdownLite(s){
    // basic: code blocks, inline code, bold, italics, links, newlines
    return s.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/\*([^*]+)\*/g, '<em>$1</em>')
            .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>')
            .replace(/\n/g, '<br>');
  }

  function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }

  async function postMessage(msg){
    if(!msg) return;
    renderBubble(msg,'user');
    setStatus('Thinking...');
    isWaiting = true;
    sendBtn.disabled = true;
    try{
      const session_id = await ensureSessionId();
      const res = await fetch('/chat/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:msg, session_id})});
      if(!res.ok) throw new Error('Server returned ' + res.status);
      const data = await res.json();
      renderBubble(data.response || '[no response]','ai');
    }catch(err){
      renderBubble('Error: ' + err.message,'ai');
    }finally{
      isWaiting=false; setStatus(''); sendBtn.disabled=false;
    }
  }

  async function uploadFile(file){
    const fd = new FormData();
    fd.append('file', file, file.name);
    setStatus('Uploading ' + file.name + '...');
    try{
      const session_id = await ensureSessionId();
      // append session id so server can associate doc with session
      fd.append('session_id', session_id);
      const res = await fetch('/chat/upload',{method:'POST',body:fd});
      if(!res.ok) throw new Error('Upload failed ' + res.status);
      const j = await res.json();
      uploadedCount += 1;
      docMsg.textContent = j.message || `${uploadedCount}/${maxDocs} uploaded`;
      setStatus('Upload complete');
    }catch(err){
      setStatus('Upload error: ' + err.message);
    }finally{
      setTimeout(()=>setStatus(''),2000);
    }
  }

  // create or read session_id from localStorage
  async function ensureSessionId(){
    let sid = localStorage.getItem('nova_session_id');
    if(sid) return sid;
    // create new session on server
    try{
      const res = await fetch('/chat/session', {method:'POST'});
      const j = await res.json();
      sid = j.session_id;
      localStorage.setItem('nova_session_id', sid);
      return sid;
    }catch(e){
      // fallback: generate a client-side uuid
      sid = 'local-' + Math.random().toString(36).slice(2,10);
      localStorage.setItem('nova_session_id', sid);
      return sid;
    }
  }

  // handle form submit (send message)
  if(form){
    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const v = input.value.trim();
      if(!v) return;
      input.value='';
      await postMessage(v);
    });
  }

  // file input — upload sequentially
  if(fileInput){
    fileInput.addEventListener('change', async (e)=>{
      const files = Array.from(e.target.files || []);
      if(uploadedCount + files.length > maxDocs){ docMsg.textContent = `Max ${maxDocs} files allowed`; e.target.value=''; return }
      for(const f of files){ await uploadFile(f) }
      e.target.value='';
    });
  }

  // keyboard: Enter to send
  if(input){ input.addEventListener('keydown',(e)=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); form.requestSubmit(); }}) }

  // optional: show a welcome message when empty
  if(chatWindow && chatWindow.children.length===0){ renderBubble('Hello! I am NOVA‑R. Ask me anything or upload a document to provide context.','ai') }
});
