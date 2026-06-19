import base64
import logging
from dataclasses import dataclass
from typing import Any, Literal

from app.core.config import settings

logger = logging.getLogger(__name__)

LLMProvider = Literal["openai", "gemini"]


@dataclass
class LLMResponse:
    content: str
    tokens_in: int
    tokens_out: int


def is_configured() -> bool:
    if settings.LLM_PROVIDER == "gemini":
        return bool(settings.GEMINI_API_KEY)
    return bool(settings.OPENAI_API_KEY)


def calculate_cost(tokens_in: int, tokens_out: int) -> float:
    if settings.LLM_PROVIDER == "gemini":
        cost_in = (tokens_in / 1_000_000) * 0.10
        cost_out = (tokens_out / 1_000_000) * 0.40
    else:
        cost_in = (tokens_in / 1_000_000) * 2.50
        cost_out = (tokens_out / 1_000_000) * 10.00
    return round(cost_in + cost_out, 4)


async def complete_text(system_prompt: str, user_message: str) -> LLMResponse:
    if settings.LLM_PROVIDER == "gemini":
        return await _gemini_complete(system_prompt, user_message)
    return await _openai_complete(system_prompt, user_message)


async def complete_vision(
    system_prompt: str,
    user_text: str,
    image_b64_list: list[str],
) -> LLMResponse:
    if settings.LLM_PROVIDER == "gemini":
        return await _gemini_complete(system_prompt, user_text, image_b64_list)
    return await _openai_complete(system_prompt, user_text, image_b64_list)


async def _openai_complete(
    system_prompt: str,
    user_message: str,
    image_b64_list: list[str] | None = None,
) -> LLMResponse:
    from openai import AsyncOpenAI

    if image_b64_list:
        user_content: str | list[dict[str, Any]] = [
            {"type": "text", "text": user_message},
            *[
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{img_b64}", "detail": "high"},
                }
                for img_b64 in image_b64_list
            ],
        ]
    else:
        user_content = user_message

    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    response = await client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        temperature=0,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ],
    )
    usage = response.usage
    return LLMResponse(
        content=response.choices[0].message.content or "{}",
        tokens_in=usage.prompt_tokens if usage else 0,
        tokens_out=usage.completion_tokens if usage else 0,
    )


async def _gemini_complete(
    system_prompt: str,
    user_message: str,
    image_b64_list: list[str] | None = None,
) -> LLMResponse:
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=settings.GEMINI_API_KEY)

    if image_b64_list:
        contents: str | list[types.Part] = [
            types.Part.from_text(text=user_message),
            *[
                types.Part.from_bytes(data=base64.b64decode(img_b64), mime_type="image/jpeg")
                for img_b64 in image_b64_list
            ],
        ]
    else:
        contents = user_message

    response = await client.aio.models.generate_content(
        model=settings.GEMINI_MODEL,
        contents=contents,
        config=types.GenerateContentConfig(
            system_instruction=system_prompt,
            temperature=0,
            response_mime_type="application/json",
        ),
    )
    usage = response.usage_metadata
    return LLMResponse(
        content=response.text or "{}",
        tokens_in=usage.prompt_token_count if usage else 0,
        tokens_out=usage.candidates_token_count if usage else 0,
    )
