"""Thin LLM provider wrapper. Default: Groq (free tier, OpenAI-compatible API).

Swapping providers later (e.g. Anthropic Claude or Gemini) only requires editing
this file — every agent calls ``generate(prompt)`` and receives a plain string.
"""

import os
import asyncio
from typing import Optional

from groq import Groq

DEFAULT_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
_client: Optional[Groq] = None


def _ensure_client() -> Groq:
    global _client
    if _client is not None:
        return _client
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError(
            "GROQ_API_KEY is not set. Add it to backend/.env — see .env.example. "
            "Get a free key at https://console.groq.com/keys."
        )
    _client = Groq(api_key=api_key)
    return _client


async def generate(prompt: str, *, model: Optional[str] = None, temperature: float = 0.4) -> str:
    """Run a single-turn completion against Groq and return the text.

    Runs the blocking SDK call in a thread so FastAPI's event loop stays free.
    """
    client = _ensure_client()
    model_name = model or DEFAULT_MODEL

    def _call():
        resp = client.chat.completions.create(
            model=model_name,
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature,
        )
        return (resp.choices[0].message.content or "").strip()

    return await asyncio.to_thread(_call)


async def stream_chat(messages, *, model: Optional[str] = None, temperature: float = 0.5):
    """Stream a multi-turn chat completion. Yields text deltas as they arrive."""
    client = _ensure_client()
    model_name = model or DEFAULT_MODEL

    loop = asyncio.get_running_loop()
    queue: asyncio.Queue = asyncio.Queue()
    SENTINEL = object()

    def _producer():
        try:
            stream = client.chat.completions.create(
                model=model_name,
                messages=messages,
                temperature=temperature,
                stream=True,
            )
            for chunk in stream:
                delta = chunk.choices[0].delta.content if chunk.choices else None
                if delta:
                    loop.call_soon_threadsafe(queue.put_nowait, delta)
        except Exception as e:  # noqa: BLE001
            loop.call_soon_threadsafe(queue.put_nowait, ("__error__", str(e)))
        finally:
            loop.call_soon_threadsafe(queue.put_nowait, SENTINEL)

    asyncio.get_running_loop().run_in_executor(None, _producer)

    while True:
        item = await queue.get()
        if item is SENTINEL:
            break
        if isinstance(item, tuple) and item and item[0] == "__error__":
            raise RuntimeError(item[1])
        yield item
