"""Generate Cloudflare Worker secrets from the private Swisscontact workbook.

No raw NIT is printed or written. The output contains only keyed HMAC digests
plus independently generated signing secrets and must never be committed.
"""

import argparse
import hashlib
import hmac
import json
import re
import secrets
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PACKAGE_REL = "http://schemas.openxmlformats.org/package/2006/relationships"
NS = {"m": MAIN, "r": REL, "p": PACKAGE_REL}


def read_nits(workbook: Path) -> list[str]:
    with zipfile.ZipFile(workbook) as archive:
        shared = []
        if "xl/sharedStrings.xml" in archive.namelist():
            root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
            shared = ["".join(node.text or "" for node in item.findall(".//m:t", NS)) for item in root.findall("m:si", NS)]

        book = ET.fromstring(archive.read("xl/workbook.xml"))
        relationships = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        targets = {item.attrib["Id"]: item.attrib["Target"] for item in relationships.findall("p:Relationship", NS)}

        data_sheet = next((item for item in book.findall("m:sheets/m:sheet", NS) if item.attrib.get("name") == "DATA"), None)
        if data_sheet is None:
            raise ValueError("No se encontró la hoja DATA")
        relation_id = data_sheet.attrib[f"{{{REL}}}id"]
        target = targets[relation_id].lstrip("/")
        sheet_path = target if target.startswith("xl/") else f"xl/{target}"
        sheet = ET.fromstring(archive.read(sheet_path))
        rows = sheet.findall("m:sheetData/m:row", NS)

        def value(cell):
            node = cell.find("m:v", NS)
            if node is None:
                return ""
            return shared[int(node.text)] if cell.attrib.get("t") == "s" else (node.text or "")

        nit_column = None
        header_index = None
        for index, row in enumerate(rows[:15]):
            for cell in row.findall("m:c", NS):
                if re.search(r"(?i)\bnit\b", value(cell)):
                    nit_column = re.match(r"[A-Z]+", cell.attrib["r"]).group()
                    header_index = index
                    break
            if nit_column:
                break
        if nit_column is None:
            raise ValueError("No se encontró la columna NIT en la hoja DATA")

        values = set()
        for row in rows[header_index + 1 :]:
            for cell in row.findall("m:c", NS):
                if re.match(r"[A-Z]+", cell.attrib["r"]).group() != nit_column:
                    continue
                nit = "".join(re.findall(r"\d", value(cell)))
                if nit:
                    if not re.fullmatch(r"\d{9,10}", nit):
                        raise ValueError("Hay un NIT con longitud inesperada")
                    values.add(nit)
        return sorted(values)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("workbook", type=Path)
    parser.add_argument("--output", type=Path, default=Path("secrets/cloudflare-production.json"))
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    if args.output.exists() and not args.force:
        raise SystemExit(f"El archivo ya existe: {args.output}. Usa --force para reemplazarlo.")

    nits = read_nits(args.workbook)
    pepper = secrets.token_urlsafe(48)
    session_secret = secrets.token_urlsafe(48)
    digests = [hmac.new(pepper.encode(), nit.encode(), hashlib.sha256).digest() for nit in nits]
    encoded = [__import__("base64").urlsafe_b64encode(item).decode().rstrip("=") for item in digests]

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps({
        "AUTH_PEPPER": pepper,
        "SESSION_SECRET": session_secret,
        "AUTHORIZED_NIT_HASHES": json.dumps(encoded, separators=(",", ":")),
    }, indent=2), encoding="utf-8")
    print(f"Archivo de secretos creado con {len(nits)} NIT autorizados: {args.output}")


if __name__ == "__main__":
    main()
