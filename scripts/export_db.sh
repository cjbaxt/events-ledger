#!/bin/bash
# Export local DB to a file ready for import into Render
pg_dump events_ledger --no-owner --no-acl -f events_ledger_export.sql
echo "Exported to events_ledger_export.sql"
echo ""
echo "To import into Render, run:"
echo "  psql <RENDER_DATABASE_URL> -f events_ledger_export.sql"
