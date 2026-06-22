#!/bin/bash
set -e

echo "Dumping database to JSON..."
source backend/.venv/bin/activate && python3 scripts/dump_to_json.py

echo "Committing and pushing..."
git add frontend/public/data
git commit -m "Update data $(date '+%Y-%m-%d')"
git push origin dev
git push origin dev:main

echo "Done! GitHub Actions will deploy in a minute or two."
