import os
import requests

NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")
BASE_URL = "https://api.nvidia.com/v1"  # Adjust if different

CHAT_MODEL = os.getenv("CHAT_MODEL", "nvidia/Nemotron-4-340B-Instruct")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-mpnet-base-v2")

headers = {"Authorization": f"Bearer {NVIDIA_API_KEY}"}


def chat_with_model(messages: list) -> str:
    """
    Call Nemotron for chat completion.
    messages: list of dicts [{role: "system"/"user"/"assistant", content: "..."}]
    """
    payload = {
        "model": CHAT_MODEL,
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 512
    }

    response = requests.post(
        f"{BASE_URL}/chat/completions",
        headers=headers,
        json=payload
    )
    response.raise_for_status()

    return response.json()["choices"][0]["message"]["content"]


def get_embeddings(text: str) -> list:
    """
    Call embedding model and return vector representation.
    """
    payload = {
        "model": EMBEDDING_MODEL,
        "input": text
    }

    response = requests.post(
        f"{BASE_URL}/embeddings",
        headers=headers,
        json=payload
    )
    response.raise_for_status()

    return response.json()["data"][0]["embedding"]
