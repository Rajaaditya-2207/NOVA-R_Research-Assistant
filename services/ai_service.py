import os
import requests
from config import Config


_config = Config()

_LEGACY_API_KEY = getattr(_config, "NVIDIA_API_KEY", None) or os.getenv("NVIDIA_API_KEY")
TEXT_API_KEY = (
    getattr(_config, "NVIDIA_TEXT_API_KEY", None)
    or os.getenv("NVIDIA_TEXT_API_KEY")
    or _LEGACY_API_KEY
)
VISION_API_KEY = (
    getattr(_config, "NVIDIA_VISION_API_KEY", None)
    or os.getenv("NVIDIA_VISION_API_KEY")
    or TEXT_API_KEY
)
EMBED_API_KEY = (
    getattr(_config, "NVIDIA_EMBED_API_KEY", None)
    or os.getenv("NVIDIA_EMBED_API_KEY")
    or TEXT_API_KEY
)
BASE_URL = (_config.NVIDIA_BASE_URL or os.getenv("NVIDIA_BASE_URL") or "https://integrate.api.nvidia.com/v1").rstrip("/")
CHAT_ENDPOINT_OVERRIDE = (
    getattr(_config, "NVIDIA_CHAT_ENDPOINT", None)
    or os.getenv("NVIDIA_CHAT_ENDPOINT")
)

if CHAT_ENDPOINT_OVERRIDE:
    _CHAT_ENDPOINTS = [CHAT_ENDPOINT_OVERRIDE.strip("/")]
else:
    _CHAT_ENDPOINTS = ["chat/completions", "responses"]

CHAT_MODEL = _config.LLM_MODEL or os.getenv("CHAT_MODEL", "nvidia/llama-3.1-nemotron-ultra-253b-v1")
VISION_MODEL = _config.VISION_MODEL or os.getenv("VISION_MODEL", "meta/llama-3.2-90b-vision-instruct")
EMBEDDING_MODEL = _config.EMBEDDING_MODEL or os.getenv("EMBEDDING_MODEL", "nvidia/nv-embedqa-e5-v5")

DEFAULT_TIMEOUT = 120  # Increased for longer responses

_session = requests.Session()


def _prepare_responses_messages(messages: list) -> list:
    formatted = []
    for message in messages:
        role = message.get("role", "user") if isinstance(message, dict) else "user"
        content = ""
        if isinstance(message, dict):
            content = message.get("content", "")

        if isinstance(content, list):
            formatted.append({
                "role": role,
                "content": content
            })
        else:
            formatted.append({
                "role": role,
                "content": [
                    {
                        "type": "text",
                        "text": str(content)
                    }
                ]
            })
    return formatted


def _flatten_content(content) -> str:
    if content is None:
        return ""
    if isinstance(content, str):
        return content
    if isinstance(content, dict):
        parts = []
        for key in ("text", "output_text", "content", "value"):
            if key in content:
                parts.append(_flatten_content(content[key]))
        return "".join(part for part in parts if part)
    if isinstance(content, list):
        parts = [_flatten_content(item) for item in content]
        return "".join(part for part in parts if part)
    return str(content)


def _extract_text_from_response(data: dict) -> str | None:
    # OpenAI-compatible structure
    if isinstance(data, dict):
        choices = data.get("choices")
        if isinstance(choices, list):
            for choice in choices:
                if not isinstance(choice, dict):
                    continue
                message = choice.get("message")
                if isinstance(message, dict):
                    content = message.get("content")
                    text = _flatten_content(content)
                    if text:
                        return text
                    reasoning = message.get("reasoning_content")
                    if reasoning:
                        text = _flatten_content(reasoning)
                        if text:
                            return text
                if "text" in choice:
                    text = _flatten_content(choice.get("text"))
                    if text:
                        return text
                reasoning = choice.get("reasoning_content")
                if reasoning:
                    text = _flatten_content(reasoning)
                    if text:
                        return text

        # Responses-style structure
        messages = data.get("messages")
        if isinstance(messages, list):
            for message in messages:
                if not isinstance(message, dict):
                    continue
                if message.get("role") == "assistant":
                    text = _flatten_content(message.get("content"))
                    if text:
                        return text

        output = data.get("output")
        if output is not None:
            text = _flatten_content(output)
            if text:
                return text

        if "output_text" in data:
            text = _flatten_content(data.get("output_text"))
            if text:
                return text

    return None


def _auth_headers(api_key: str | None):
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    return headers


def chat_with_vision(messages, image_data_list=None):
    """
    Chat with vision model for image analysis.
    Supports llama-3.2-90b-vision-instruct for images.
    
    Args:
        messages: List of message dicts with 'role' and 'content'
        image_data_list: List of base64 encoded images (data:image/jpeg;base64,...)
    
    Returns:
        str: Model response
    """
    if not VISION_API_KEY:
        return "NVIDIA Vision API key not configured. Please set NVIDIA_VISION_API_KEY."
    
    # Format messages for vision model
    formatted_messages = []
    
    # Only include the last user message with images for vision model
    # Vision models work best with single-turn image analysis
    if image_data_list and len(image_data_list) > 0:
        # Get the last user message
        last_user_message = None
        for msg in reversed(messages):
            if msg['role'] == 'user':
                last_user_message = msg['content']
                break
        
        if not last_user_message:
            return "No user message found for image analysis."
        
        # Format as multimodal content
        content = [{"type": "text", "text": last_user_message}]
        for img_data in image_data_list:
            content.append({
                "type": "image_url",
                "image_url": {"url": img_data}
            })
        
        formatted_messages.append({
            "role": "user",
            "content": content
        })
    else:
        # No images - just pass messages as-is
        formatted_messages = messages
    
    payload = {
        "model": VISION_MODEL,
        "messages": formatted_messages,
        "temperature": 0.5,
        "max_tokens": 16384,
        "top_p": 0.7,
        "stream": False
    }
    
    try:
        response = _session.post(
            f"{BASE_URL}/chat/completions",
            headers=_auth_headers(VISION_API_KEY),
            json=payload,
            timeout=120  # Vision models may take longer
        )
        
        # Log error details for debugging
        if response.status_code != 200:
            print(f"Vision API Error {response.status_code}: {response.text}")
        
        response.raise_for_status()
        data = response.json()
        
        text = _extract_text_from_response(data)
        if text:
            return text
        
        return "Vision model returned no content."
        
    except requests.exceptions.RequestException as exc:
        error_msg = f"Vision model error: {exc}"
        if hasattr(exc, 'response') and exc.response is not None:
            try:
                error_detail = exc.response.json()
                error_msg += f"\nDetails: {error_detail}"
            except:
                error_msg += f"\nResponse: {exc.response.text}"
        print(error_msg)
        return f"Unable to analyze image. Please try again."


def chat_with_model(messages: list) -> str:
    """
    Call Nemotron for chat completion.
    messages: list of dicts [{role: "system"/"user"/"assistant", content: "..."}]
    """
    payload_chat = {
        "model": CHAT_MODEL,
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 16384,
        "top_p": 1,
        "stream": False
    }

    payload_responses = {
        "model": CHAT_MODEL,
        "messages": _prepare_responses_messages(messages),
        "temperature": 0.7,
        "max_output_tokens": 16384,
        "top_p": 1
    }

    if not TEXT_API_KEY:
        # Fallback response when API key is not set
        return "I'm sorry, but the NVIDIA text API key is not configured. Please set your NVIDIA_TEXT_API_KEY environment variable to enable AI responses."

    errors: list[str] = []

    for endpoint in _CHAT_ENDPOINTS:
        endpoint = endpoint.strip("/")
        url = f"{BASE_URL}/{endpoint}" if endpoint else BASE_URL
        payload = payload_responses if endpoint == "responses" else payload_chat

        try:
            response = _session.post(
                url,
                headers=_auth_headers(TEXT_API_KEY),
                json=payload,
                timeout=DEFAULT_TIMEOUT
            )
        except requests.exceptions.RequestException as exc:
            errors.append(f"{endpoint or BASE_URL}: network error ({exc})")
            continue

        if response.status_code == 404 and endpoint != _CHAT_ENDPOINTS[-1]:
            errors.append(f"{endpoint}: 404 Not Found")
            continue

        try:
            response.raise_for_status()
        except requests.exceptions.HTTPError as http_err:
            errors.append(f"{endpoint}: HTTP {response.status_code} ({response.text.strip()[:200]})")
            continue

        try:
            data = response.json()
        except ValueError as json_err:
            errors.append(f"{endpoint}: invalid JSON response ({json_err})")
            continue

        text = _extract_text_from_response(data)
        if text:
            return text

        errors.append(f"{endpoint}: unable to extract assistant content")

    detail = "; ".join(errors) if errors else "unknown error"
    raise RuntimeError(f"Chat API failed across endpoints: {detail}")


def get_embeddings(text, input_type="passage"):
    """
    Generate embeddings for text using NVIDIA API.
    
    Args:
        text: str or list[str] - text to embed
        input_type: str - "passage" for documents/storage, "query" for search queries
    
    Returns:
        embedding (list) if text is str, or list of embeddings if text is list
    """
    if not EMBED_API_KEY:
        raise RuntimeError("NVIDIA_EMBED_API_KEY not set")
    
    # Handle both single string and list inputs
    input_texts = text if isinstance(text, list) else [text]
    
    # Truncate very long texts to avoid API errors
    # NVIDIA limit: 512 tokens max
    # Very conservative: 1 token ≈ 1.5-3 characters for very dense text (code, binary)
    # Use 800 chars to stay well under limit (≈ 200-400 tokens)
    MAX_CHARS = 800
    truncated_texts = []
    for txt in input_texts:
        if len(txt) > MAX_CHARS:
            # For very long documents, take only the beginning
            # This preserves the most important context (usually at start)
            truncated = txt[:MAX_CHARS] + "\n... [content truncated]"
            truncated_texts.append(truncated)
            print(f"Warning: Text truncated from {len(txt)} to {len(truncated)} characters")
        else:
            truncated_texts.append(txt)
    
    payload = {
        "model": EMBEDDING_MODEL,
        "input": truncated_texts,
        "input_type": input_type,
        "encoding_format": "float"
    }
    
    try:
        response = _session.post(
            f"{BASE_URL}/embeddings",
            headers=_auth_headers(EMBED_API_KEY),
            json=payload,
            timeout=DEFAULT_TIMEOUT
        )
        response.raise_for_status()
        data = response.json()
        
        # handle both single and batched responses
        if "data" in data and len(data["data"]) > 0:
            embeddings = [item["embedding"] for item in data["data"]]
            # Return single embedding if input was single string
            return embeddings[0] if not isinstance(text, list) else embeddings
        else:
            raise RuntimeError("No valid embeddings in response")
            
    except requests.exceptions.HTTPError as e:
        error_detail = ""
        try:
            error_data = response.json()
            error_detail = f" - {error_data.get('detail', error_data)}"
        except:
            error_detail = f" - {response.text[:200]}"
        raise RuntimeError(f"Embeddings API request failed: {str(e)}{error_detail}")
    except requests.exceptions.RequestException as e:
        raise RuntimeError(f"Embeddings API network error: {str(e)}")
    except Exception as e:
        raise RuntimeError(f"Unexpected error in embeddings: {str(e)}")
