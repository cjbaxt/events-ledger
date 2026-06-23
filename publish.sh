#!/bin/bash
set -e

echo "▶ Dumping database to JSON..."
source backend/.venv/bin/activate && python3 scripts/dump_to_json.py
echo "✓ Database dumped"

echo ""
echo "▶ Staging data files..."
git add frontend/public/data
CHANGED=$(git diff --cached --name-only | wc -l | tr -d ' ')
echo "  $CHANGED file(s) staged"

echo ""
echo "▶ Committing..."
git commit -m "Update data $(date '+%Y-%m-%d')" || echo "  (nothing to commit, data unchanged)"
echo "✓ Committed"

echo ""
echo "▶ Pushing to dev..."
git push origin dev
echo "✓ Pushed to dev"

echo ""
echo "▶ Pushing to main (triggers GitHub Actions)..."
git push origin dev:main
echo "✓ Pushed to main"

echo ""
echo "▶ Waiting for GitHub Actions to start..."
sleep 5

RUN_ID=$(gh run list --repo cjbaxt/events-ledger --branch main --workflow deploy.yml --limit 1 --json databaseId --jq '.[0].databaseId')
if [ -z "$RUN_ID" ]; then
  echo "  Could not find a workflow run — check https://github.com/cjbaxt/events-ledger/actions"
  exit 0
fi

echo "  Run ID: $RUN_ID"
echo "  Watching: https://github.com/cjbaxt/events-ledger/actions/runs/$RUN_ID"
echo ""

SECONDS_WAITED=0
while true; do
  STATUS=$(gh run view "$RUN_ID" --repo cjbaxt/events-ledger --json status,conclusion --jq '[.status, .conclusion] | join(" ")')
  STATE=$(echo "$STATUS" | awk '{print $1}')
  CONCLUSION=$(echo "$STATUS" | awk '{print $2}')

  if [ "$STATE" = "completed" ]; then
    echo ""
    if [ "$CONCLUSION" = "success" ]; then
      echo "✓ Deployed successfully!"
      echo "  https://cjbaxt.github.io/events-ledger"
    else
      echo "✗ Deployment failed (conclusion: $CONCLUSION)"
      echo "  https://github.com/cjbaxt/events-ledger/actions/runs/$RUN_ID"
    fi
    break
  fi

  printf "  Still running... (%ds)\r" "$SECONDS_WAITED"
  sleep 10
  SECONDS_WAITED=$((SECONDS_WAITED + 10))

  if [ "$SECONDS_WAITED" -gt 300 ]; then
    echo ""
    echo "  Timed out waiting — check manually:"
    echo "  https://github.com/cjbaxt/events-ledger/actions/runs/$RUN_ID"
    break
  fi
done
