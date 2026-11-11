"""Cálculos dos gráficos. Funções puras, que funcionam igual em SQLite e PostgreSQL."""

from collections import defaultdict
from datetime import date, timedelta

Row = tuple[date, int]


def week_start(day: date) -> date:
    return day - timedelta(days=day.weekday())


def daily_series(rows: list[Row], today: date, days: int = 30) -> list[dict]:
    totals: dict[date, int] = defaultdict(int)
    for day, minutes in rows:
        totals[day] += minutes
    return [
        {"date": day, "minutes": totals[day]}
        for day in (today - timedelta(days=offset) for offset in range(days - 1, -1, -1))
    ]


def weekly_series(rows: list[Row], today: date, weeks: int = 12) -> list[dict]:
    totals: dict[date, int] = defaultdict(int)
    for day, minutes in rows:
        totals[week_start(day)] += minutes
    current = week_start(today)
    starts = (current - timedelta(weeks=offset) for offset in range(weeks - 1, -1, -1))
    return [{"week_start": start, "minutes": totals[start]} for start in starts]


def monthly_series(rows: list[Row], today: date, months: int = 12) -> list[dict]:
    totals: dict[str, int] = defaultdict(int)
    for day, minutes in rows:
        totals[day.strftime("%Y-%m")] += minutes
    series = []
    for offset in range(months - 1, -1, -1):
        index = today.year * 12 + (today.month - 1) - offset
        key = f"{index // 12:04d}-{index % 12 + 1:02d}"
        series.append({"month": key, "minutes": totals[key]})
    return series
