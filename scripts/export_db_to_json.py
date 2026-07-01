#!/usr/bin/env python3
"""
export_db_to_json.py
────────────────────
Exporta la tabla 'hymns' de la base de datos SQLite de la app Android
al formato JSON que consume la PWA.

Uso:
    python export_db_to_json.py <ruta/a/database.db>
    python export_db_to_json.py <ruta/a/database.db> --version 1.1
    python export_db_to_json.py <ruta/a/database.db> --out ../himnario-pwa/public/data/hymns.json

El archivo resultante se copia a public/data/hymns.json en el proyecto PWA.
"""

import sqlite3
import json
import sys
import argparse
from pathlib import Path


def export(db_path: str, output_path: str, version: str) -> None:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute(
        "SELECT id, title, lyrics, numero, category, musical_key, musical_notation "
        "FROM hymns ORDER BY COALESCE(numero, id) ASC"
    )
    rows = cur.fetchall()
    conn.close()

    hymns = []
    for row in rows:
        hymns.append(
            {
                "id": row["id"],
                "numero": row["numero"],
                "title": (row["title"] or "").strip(),
                "lyrics": (row["lyrics"] or "").strip(),
                "category": row["category"],
                "musical_key": row["musical_key"],
                "musical_notation": row["musical_notation"],
                "note": None,  # las notas personales las gestiona la PWA localmente
            }
        )

    payload = {"version": version, "data": hymns}

    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)

    with open(out, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    print(f"✅  {len(hymns)} himnos exportados → {out}")
    print(f"    Versión: {version}")
    print()
    print("Próximo paso:")
    print(f"  Copia {out} a himnario-pwa/public/data/hymns.json")
    print("  Incrementa --version cuando actualices la DB para que la PWA se actualice.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Exporta la DB de himnos a JSON para la PWA")
    parser.add_argument("db", help="Ruta al archivo .db de SQLite")
    parser.add_argument("--version", default="1.0", help="Versión del dataset (default: 1.0)")
    parser.add_argument(
        "--out",
        default="../himnario-pwa/public/data/hymns.json",
        help="Ruta del archivo JSON de salida",
    )
    args = parser.parse_args()

    db_path = Path(args.db)
    if not db_path.exists():
        print(f"❌  No se encontró la DB: {db_path}", file=sys.stderr)
        sys.exit(1)

    export(str(db_path), args.out, args.version)


if __name__ == "__main__":
    main()
