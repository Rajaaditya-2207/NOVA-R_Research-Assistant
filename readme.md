# NOVA AI Assistant Chatbot

A modern, ChatGPT-style web chat UI powered by NVIDIA's Llama-3.1 model via OpenAI API, built with Flask and JavaScript. Supports:
- Streaming AI responses with markdown, code, and lists
- File and image upload (sent as base64 in JSON)
- Animated background and modern UI

## Features
- Chat with an AI assistant (NOVA) using natural language
- Upload and preview images/files in chat
- Fast, streaming agent responses with markdown formatting
- Responsive, beautiful UI with animated background

## Setup

1. **Clone the repository** (or copy the files to your project folder)
2. **Install dependencies**:
	```bash
	pip install -r requirements.txt
	```
3. **Set your NVIDIA API key**:
	- Create a `.env` file in the project root:
	  ```env
	  NVIDIA_API_KEY=your_nvidia_api_key_here
	  ```
4. **Run the app**:
	```bash
	python app.py
	```
5. **Open your browser** to [http://localhost:5000](http://localhost:5000)

## File Upload
- Images and files are sent as base64 in JSON to the backend.
- The backend echoes file info and previews in the agent response for demo purposes.

## Customization
- Modify `app.py` for backend logic or to save files.
- Edit `templates/index.html` for UI tweaks.

## Requirements
- Python 3.8+
- NVIDIA API key (for Llama-3.1 via OpenAI API)

## License
MIT
# NOVA – Simple Web-based Chatbot (Flask + HTML/CSS/JS)

## Features

- Text-based chatbot with simple rule-based NLP
- Styled frontend with dark mode UI
- Flask backend with `/chat` endpoint
- Arch Linux + Paper plane send icon

## Setup

```bash
pip install -r requirements.txt
python app.py
