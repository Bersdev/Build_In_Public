"""Leitura de roadmaps em CSV. Função pura: recebe o texto e devolve as etapas, sem tocar no banco.

Formato: uma linha por conteúdo. Só a coluna do conteúdo é obrigatória.

    etapa,item,link,notas
    Fundamentos,Variáveis e tipos,https://docs.python.org,
    Fundamentos,Condicionais,,Ver if/elif/else

Aceita vírgula ou ponto e vírgula (padrão do Excel em português), BOM do Excel e nomes de
coluna em português ou inglês, com ou sem acento. Etapa vazia repete a da linha anterior.
"""

import csv
import io
import unicodedata
from dataclasses import dataclass, field

from pydantic import TypeAdapter, ValidationError

from app.core.errors import ValidationFailed
from app.core.schemas import WebUrl

MAX_ITEMS = 500
MAX_STAGES = 200
MAX_ERRORS = 20
DEFAULT_STAGE = "Conteúdos"

COLUMNS = {
    "stage": {"etapa", "fase", "modulo", "secao", "stage", "section", "module", "step"},
    "title": {"item", "conteudo", "titulo", "topico", "assunto", "title", "topic", "content", "name", "nome"},
    "url": {"link", "url", "referencia", "endereco", "reference"},
    "notes": {"notas", "nota", "anotacoes", "observacoes", "observacao", "obs", "descricao", "notes", "description"},
}

_url = TypeAdapter(WebUrl)


@dataclass
class ParsedItem:
    title: str
    url: str | None = None
    notes: str | None = None


@dataclass
class ParsedStage:
    title: str
    items: list[ParsedItem] = field(default_factory=list)


def _normalize(name: str) -> str:
    without_accents = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    return without_accents.strip().lower().replace(" ", "").replace("_", "")


def _map_columns(header: list[str]) -> dict[str, int]:
    positions: dict[str, int] = {}
    for index, name in enumerate(header):
        key = _normalize(name)
        for column, aliases in COLUMNS.items():
            if key in aliases and column not in positions:
                positions[column] = index
    if "title" not in positions:
        raise ValidationFailed(
            "O arquivo precisa de uma coluna com o conteúdo, chamada \"item\" ou \"conteúdo\". "
            "Use também \"etapa\", \"link\" e \"notas\", se quiser."
        )
    return positions


def _cell(row: list[str], positions: dict[str, int], column: str) -> str:
    index = positions.get(column)
    return row[index].strip() if index is not None and index < len(row) else ""


def _reader(content: str):
    content = content.lstrip("﻿")
    first_line = content.split("\n", 1)[0]
    delimiter = ";" if first_line.count(";") > first_line.count(",") else ","
    rows = csv.reader(io.StringIO(content), delimiter=delimiter)
    header = next(rows, None)
    if not header or not any(cell.strip() for cell in header):
        raise ValidationFailed("O arquivo está vazio.")
    return header, rows


def read_rows(content: str) -> tuple[list[str], list[tuple[int, list[str]]]]:
    """Cabeçalho e linhas não vazias, cada uma com o número da linha no arquivo."""
    header, rows = _reader(content)
    lines = [
        (line_number, [cell.strip() for cell in row])
        for line_number, row in enumerate(rows, start=2)
        if any(cell.strip() for cell in row)
    ]
    return [cell.strip() for cell in header], lines


def parse_roadmap_csv(content: str) -> list[ParsedStage]:
    header, rows = _reader(content)
    positions = _map_columns(header)

    stages: dict[str, ParsedStage] = {}
    errors: list[dict] = []
    current_stage = DEFAULT_STAGE
    total = 0

    for line_number, row in enumerate(rows, start=2):
        if not any(cell.strip() for cell in row):
            continue
        current_stage = _cell(row, positions, "stage") or current_stage
        title = _cell(row, positions, "title")
        url = _cell(row, positions, "url") or None
        notes = _cell(row, positions, "notes") or None
        line = f"Linha {line_number}"

        if not title:
            errors.append({"field": line, "message": "O conteúdo não pode ficar vazio."})
        elif len(title) > 200 or len(current_stage) > 200:
            errors.append({"field": line, "message": "Etapa e conteúdo aceitam até 200 caracteres."})
        if url:
            try:
                _url.validate_python(url)
            except ValidationError:
                errors.append({"field": line, "message": "Informe um link iniciado por http:// ou https://."})
        if notes and len(notes) > 20_000:
            errors.append({"field": line, "message": "As notas aceitam até 20.000 caracteres."})
        if len(errors) >= MAX_ERRORS:
            break

        total += 1
        if total > MAX_ITEMS:
            raise ValidationFailed(f"O arquivo pode ter até {MAX_ITEMS} conteúdos.")
        stage = stages.setdefault(current_stage, ParsedStage(current_stage))
        stage.items.append(ParsedItem(title, url, notes))

    if errors:
        raise ValidationFailed("Corrija as linhas indicadas e importe de novo.", errors)
    if total == 0:
        raise ValidationFailed("O arquivo não tem nenhum conteúdo abaixo do cabeçalho.")
    if len(stages) > MAX_STAGES:
        raise ValidationFailed(f"O arquivo pode ter até {MAX_STAGES} etapas.")
    return list(stages.values())
