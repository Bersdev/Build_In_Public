"""Cliente mínimo da API da Groq (compatível com a da OpenAI).

Usa só a biblioteca padrão (urllib), sem dependência nova. A chave vem de GROQ_API_KEY e
nunca sai do backend.
"""

import json
import urllib.error
import urllib.request

from app.core.config import get_settings

TIMEOUT_SECONDS = 55


class GroqError(Exception):
    """Falha ao falar com a Groq, com uma mensagem que pode ir para a tela."""


class GroqRateLimited(GroqError):
    """Limite de uso atingido (429). Basta esperar retry_after segundos e tentar de novo."""

    def __init__(self, message: str, retry_after: int):
        super().__init__(message)
        self.retry_after = retry_after


def _retry_after(headers) -> int:
    try:
        return max(1, min(120, int(float(headers.get("retry-after")))))
    except (TypeError, ValueError, AttributeError):
        return 20


def is_configured() -> bool:
    return bool(get_settings().groq_api_key.strip())


def _http_error_message(code: int) -> str:
    if code in (401, 403):
        return "A Groq recusou a chave. Confira GROQ_API_KEY."
    if code == 429:
        return "A chave da Groq atingiu o limite de uso. Tente de novo em alguns instantes."
    if code == 413:
        return "Esta parte do arquivo ficou grande demais para a IA. Encurte as células mais longas do CSV."
    return f"A Groq respondeu com erro {code}. Tente de novo em instantes."


def complete_json(messages: list[dict], schema: dict) -> dict:
    """Pede uma resposta que siga exatamente o JSON Schema informado (modo estrito)."""
    settings = get_settings()
    body = {
        "model": settings.groq_model,
        "messages": messages,
        "temperature": 0.2,
        # O plano gratuito permite 8 mil tokens por minuto (pedido + resposta): a resposta é curta.
        "max_completion_tokens": 3_500,
        "response_format": {
            "type": "json_schema",
            "json_schema": {"name": "plano_de_estudos", "strict": True, "schema": schema},
        },
    }
    if settings.groq_model.startswith("openai/gpt-oss"):
        # Raciocínio curto: classificar linhas não pede muito, e os tokens contam no limite.
        body["reasoning_effort"] = "low"
    request = urllib.request.Request(
        f"{settings.groq_base_url.rstrip('/')}/chat/completions",
        data=json.dumps(body).encode(),
        headers={
            "Authorization": f"Bearer {settings.groq_api_key.strip()}",
            "Content-Type": "application/json",
            "User-Agent": "devtrack",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
            data = json.load(response)
    except urllib.error.HTTPError as error:
        if error.code == 429:
            raise GroqRateLimited(_http_error_message(429), _retry_after(error.headers)) from error
        raise GroqError(_http_error_message(error.code)) from error
    except (urllib.error.URLError, TimeoutError) as error:
        raise GroqError("Não foi possível falar com a Groq agora. Tente de novo em instantes.") from error

    try:
        content = data["choices"][0]["message"]["content"]
        result = json.loads(content)
    except (KeyError, IndexError, TypeError, json.JSONDecodeError) as error:
        raise GroqError("A IA devolveu uma resposta incompleta. Tente de novo.") from error
    if not isinstance(result, dict):
        raise GroqError("A IA devolveu uma resposta incompleta. Tente de novo.")
    return result
