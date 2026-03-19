from __future__ import annotations

import argparse
import csv
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from html import unescape
from pathlib import Path
from typing import Iterable


REQUIRED_HEADERS = [
    "Picto Name",
    "Effect",
    "Health",
    "Defense",
    "Speed",
    "Critical Rate",
    "Map and Nearest Flag",
    "How to Get",
]

BASE_URL = "https://expedition33.wiki.fextralife.com/"
USER_AGENT = "boss-overlay-pictos-scraper/1.0"


@dataclass
class PictoCatalogEntry:
    picto_id: str
    friendly_name: str


@dataclass
class PictoAcquireRow:
    picto_name: str
    effect: str = ""
    health: str = ""
    defense: str = ""
    speed: str = ""
    critical_rate: str = ""
    map_and_nearest_flag: str = ""
    how_to_get: str = ""

    def as_dict(self) -> dict[str, str]:
        return {
            "Picto Name": self.picto_name,
            "Effect": self.effect,
            "Health": self.health,
            "Defense": self.defense,
            "Speed": self.speed,
            "Critical Rate": self.critical_rate,
            "Map and Nearest Flag": self.map_and_nearest_flag,
            "How to Get": self.how_to_get,
        }


def collapse_whitespace(value: str) -> str:
    return re.sub(r"\s+", " ", unescape(value)).strip()


def strip_tags(value: str) -> str:
    without_breaks = re.sub(r"<br\s*/?>", " ", value, flags=re.IGNORECASE)
    without_tags = re.sub(r"<[^>]+>", " ", without_breaks)
    return collapse_whitespace(without_tags)


def read_catalog(path: Path) -> list[PictoCatalogEntry]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    return [
        PictoCatalogEntry(picto_id=picto_id, friendly_name=friendly_name)
        for picto_id, friendly_name in raw["Pictos"].items()
    ]


def read_tsv(path: Path) -> tuple[list[dict[str, str]], list[str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle, delimiter="\t")
        if reader.fieldnames is None:
            raise ValueError(f"{path} is missing a header row")

        fieldnames = [field.strip() for field in reader.fieldnames]
        rows = []
        for row in reader:
            rows.append({key.strip(): (value or "").strip() for key, value in row.items()})
        return rows, fieldnames


def write_tsv(path: Path, rows: Iterable[dict[str, str]]) -> None:
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=REQUIRED_HEADERS, delimiter="\t")
        writer.writeheader()
        for row in rows:
            writer.writerow({header: row.get(header, "") for header in REQUIRED_HEADERS})


def fetch_html(url: str) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=30) as response:
        charset = response.headers.get_content_charset() or "utf-8"
        return response.read().decode(charset, errors="replace")


def build_url(base_url: str, friendly_name: str) -> str:
    slug = urllib.parse.quote(friendly_name, safe="'").replace("%20", "+")
    return urllib.parse.urljoin(base_url, slug)


def extract_table_rows(html: str) -> list[list[str]]:
    tables = re.findall(r"<table\b[^>]*>(.*?)</table>", html, flags=re.IGNORECASE | re.DOTALL)

    for table in tables:
        row_blocks = re.findall(r"<tr\b[^>]*>(.*?)</tr>", table, flags=re.IGNORECASE | re.DOTALL)
        rows: list[list[str]] = []
        for row_block in row_blocks:
            cells = re.findall(r"<t[dh]\b[^>]*>(.*?)</t[dh]>", row_block, flags=re.IGNORECASE | re.DOTALL)
            cleaned = [strip_tags(cell) for cell in cells]
            if cleaned:
                rows.append(cleaned)

        if not rows:
            continue

        headers = [cell.lower() for cell in rows[0][:3]]
        if headers == ["location", "level", "description"]:
            return rows

    return []


def extract_information_items(html: str) -> list[str]:
    match = re.search(
        r"<h3\b[^>]*>\s*Clair\s+Obscur\s+Expedition\s+33\s+.*?\s+Pictos\s+Information\s*</h3>\s*<ul\b[^>]*>(.*?)</ul>",
        html,
        flags=re.IGNORECASE | re.DOTALL,
    )
    if not match:
        return []

    block = match.group(1)
    items = re.findall(r"<li\b[^>]*>(.*?)</li>", block, flags=re.IGNORECASE | re.DOTALL)
    return [strip_tags(item) for item in items if strip_tags(item)]


def parse_passive_bonuses(text: str) -> dict[str, str]:
    stats = {
        "Health": "",
        "Defense": "",
        "Speed": "",
        "Critical Rate": "",
    }

    prefix = "Passive Bonuses:"
    if not text.startswith(prefix):
        return stats

    bonuses = text[len(prefix) :].strip()
    for part in [segment.strip() for segment in bonuses.split(",") if segment.strip()]:
        match = re.match(r"(.+?)\s+(Health|Defense|Speed|Critical Rate)$", part)
        if not match:
            continue
        value, stat_name = match.groups()
        stats[stat_name] = value.strip()

    return stats


def parse_picto_page(html: str, picto: PictoCatalogEntry) -> PictoAcquireRow:
    info_items = extract_information_items(html)
    location_rows = extract_table_rows(html)

    effect = ""
    health = ""
    defense = ""
    speed = ""
    critical_rate = ""
    map_and_nearest_flag = ""
    how_to_get = ""

    for item in info_items:
        if item.startswith("Passive Bonuses:"):
            stats = parse_passive_bonuses(item)
            health = stats["Health"]
            defense = stats["Defense"]
            speed = stats["Speed"]
            critical_rate = stats["Critical Rate"]
        elif item.startswith("Luminas Effect:"):
            effect = item.removeprefix("Luminas Effect:").strip()
        elif item.startswith("Lumina's Effect:"):
            effect = item.removeprefix("Lumina's Effect:").strip()

    if len(location_rows) > 1:
        first_data_row = location_rows[1]
        if len(first_data_row) >= 3:
            location = first_data_row[0]
            description = first_data_row[2]
            map_and_nearest_flag = f"{location} ()" if location else ""
            how_to_get = description

    return PictoAcquireRow(
        picto_name=picto.friendly_name,
        effect=effect,
        health=health,
        defense=defense,
        speed=speed,
        critical_rate=critical_rate,
        map_and_nearest_flag=map_and_nearest_flag,
        how_to_get=how_to_get,
    )


def find_missing_pictos(
    catalog: list[PictoCatalogEntry],
    rows: list[dict[str, str]],
) -> list[PictoCatalogEntry]:
    known_names = {row["Picto Name"].strip() for row in rows if row.get("Picto Name")}
    return [entry for entry in catalog if entry.friendly_name not in known_names]


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Scrape picto acquisition data from Fextralife into pictos_acquire.tsv.",
    )
    parser.add_argument(
        "--catalog",
        type=Path,
        default=Path("data/pictos.json"),
        help="Path to the generated picto catalog JSON.",
    )
    parser.add_argument(
        "--tsv",
        type=Path,
        default=Path("data/pictos_acquire.tsv"),
        help="Path to the TSV file to update.",
    )
    parser.add_argument(
        "--base-url",
        default=BASE_URL,
        help="Base URL for picto pages.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print the pictos that would be scraped without writing changes.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Optional limit on how many pictos to scrape.",
    )
    args = parser.parse_args()

    catalog = read_catalog(args.catalog)
    rows, fieldnames = read_tsv(args.tsv)

    missing_headers = [header for header in REQUIRED_HEADERS if header not in fieldnames]
    if missing_headers:
        raise ValueError(
            f"{args.tsv} is missing required headers: {', '.join(missing_headers)}"
        )

    target_pictos = find_missing_pictos(catalog, rows)
    if args.limit > 0:
        target_pictos = target_pictos[: args.limit]

    if not target_pictos:
        print("No pictos selected for scraping.")
        return 0

    print(f"Found {len(target_pictos)} pictos to scrape.")
    for entry in target_pictos:
        print(f"- {entry.friendly_name} ({entry.picto_id})")

    if args.dry_run:
        return 0

    scraped_rows: list[dict[str, str]] = []
    failed: list[str] = []

    for picto in target_pictos:
        url = build_url(args.base_url, picto.friendly_name)
        print(f"Fetching {url}")
        try:
            html = fetch_html(url)
            parsed = parse_picto_page(html, picto)
            scraped_rows.append(parsed.as_dict())
        except (urllib.error.URLError, TimeoutError, ValueError) as error:
            print(f"Failed to fetch {picto.friendly_name}: {error}", file=sys.stderr)
            failed.append(picto.friendly_name)

    if scraped_rows:
        merged_rows = rows + scraped_rows
        write_tsv(args.tsv, merged_rows)
        print(f"Appended {len(scraped_rows)} scraped rows to {args.tsv}.")

    if failed:
        print("Failed pictos:", file=sys.stderr)
        for picto_name in failed:
            print(f"- {picto_name}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
