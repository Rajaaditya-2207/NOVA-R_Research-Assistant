from flask import Flask, render_template, request, jsonify
from openai import OpenAI
from dotenv import load_dotenv
import os
import re
import html

load_dotenv()

NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")

client = OpenAI(
    base_url="https://integrate.api.nvidia.com/v1",
    api_key=NVIDIA_API_KEY,
)

app = Flask(__name__)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    user_input = data.get("message", "")
    files = data.get("files", [])
    try:
        # For demo: show file info in response if files are sent
        file_info = ""
        if files:
            file_info = "\n\n<b>Files received:</b><br>"
            for f in files:
                if f.get("type", "").startswith("image/"):
                    file_info += f'<img src="data:{f["type"]};base64,{f["data"]}" style="max-width:4rem;max-height:4rem;margin:0.2rem 0.5rem 0.2rem 0;vertical-align:middle;border-radius:0.5rem;border:1px solid #3a2a5a;" title="{f["name"]}"> '
                else:
                    file_info += f'<span style="background:#23232e;color:#a78bfa;font-size:0.95em;padding:0.2rem 0.7rem;border-radius:0.5rem;border:1px solid #3a2a5a;margin-right:0.3rem;">{f["name"]}</span> '

        completion = client.chat.completions.create(
            model="nvidia/llama-3.1-nemotron-ultra-253b-v1",
            messages=[
                {"role": "system", "content": "You are NOVA-R, a helpful Research Citation and Explanation Agent ."},
                {"role": "user", "content": user_input}
            ],
            temperature=0.6,
            top_p=0.95,
            max_tokens=4096,
            frequency_penalty=0,
            presence_penalty=0,
        )

        raw_response = completion.choices[0].message.content.strip()

        # --- Markdown to HTML formatting ---
        def md_to_html(md):
            # Escape HTML
            md = html.escape(md)
            # Bold **text**
            md = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', md)
            # Italic *text*
            md = re.sub(r'\*(.*?)\*', r'<em>\1</em>', md)
            # Inline code `code`
            md = re.sub(r'`([^`]+)`', r'<code>\1</code>', md)
            # Links [text](url)
            md = re.sub(r'\[([^\]]+)\]\((https?://[^\s)]+)\)', r'<a href="\2" target="_blank" rel="noopener noreferrer">\1</a>', md)
            # Ordered lists
            md = re.sub(r'(^|\n)\d+[\.)] (.*)', r'\1<ol><li>\2</li></ol>', md)
            # Unordered lists
            md = re.sub(r'(^|\n)[\-*] (.*)', r'\1<ul><li>\2</li></ul>', md)
            # Code blocks ```
            md = re.sub(r'```([a-zA-Z0-9]*)\n([\s\S]*?)```', lambda m: f'<pre><code>{html.escape(m.group(2))}</code></pre>', md)
            # Headings ###
            md = re.sub(r'^### (.*)$', r'<h3>\1</h3>', md, flags=re.MULTILINE)
            return md

        formatted_response = md_to_html(raw_response) + file_info

        return jsonify({"response": formatted_response})
    except Exception as e:
        return jsonify({"response": f"⚠️ Error: {str(e)}"})

if __name__ == "__main__":
    app.run(debug=True)
