from typing import Annotated, ClassVar
from urllib.parse import urlparse

from pydantic import AfterValidator, BaseModel, BeforeValidator, ConfigDict, Field, model_validator


def _validate_web_url(value: str) -> str:
    # Bloqueia endereços como javascript:, que executariam código ao clicar no link.
    parsed = urlparse(value)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        raise ValueError("Informe um endereço iniciado por http:// ou https://.")
    return value


def _names(values: object) -> object:
    if isinstance(values, (list, set, tuple)):
        return [getattr(item, "name", item) for item in values]
    return values


Title = Annotated[str, Field(min_length=1, max_length=200)]
LongText = Annotated[str, Field(max_length=20_000)]
ShortText = Annotated[str, Field(max_length=100)]
WebUrl = Annotated[str, Field(max_length=500), AfterValidator(_validate_web_url)]
Minutes = Annotated[int, Field(ge=1, le=1440)]
# No máximo 30 nomes por registro: cada nome novo vira uma linha no catálogo da pessoa.
NameList = Annotated[list[Annotated[str, Field(min_length=1, max_length=60)]], Field(max_length=30), BeforeValidator(_names)]


class Schema(BaseModel):
    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)


class PatchSchema(Schema):
    """Atualização parcial: só muda o que foi enviado."""

    non_nullable: ClassVar[frozenset[str]] = frozenset()

    @model_validator(mode="after")
    def _reject_nulls(self):
        for name in self.model_fields_set & self.non_nullable:
            if getattr(self, name) is None:
                raise ValueError(f"O campo {name} não pode ficar vazio.")
        return self

    def changes(self) -> dict:
        return self.model_dump(exclude_unset=True)
