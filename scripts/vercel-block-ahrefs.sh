#!/usr/bin/env bash
# Deny AhrefsBot at the Vercel Firewall (project-level custom rule).
# Run from client/ with the project linked to production (aotracker).
# Also enforced per-deployment via the AhrefsBot route in vercel.json.
set -euo pipefail

cd "$(dirname "$0")/../"

echo "Adding Vercel Firewall deny rule for AhrefsBot…"

npx vercel firewall rules add "Block AhrefsBot" \
  --condition '{"type":"user_agent","op":"sub","value":"AhrefsBot"}' \
  --action deny --yes

npx vercel firewall rules publish --yes

echo "Done. Test with:"
echo "  curl -A 'Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)' -sI 'https://www.aotracker.net/'"
