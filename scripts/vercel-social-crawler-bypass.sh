#!/usr/bin/env bash
# Add Vercel Firewall bypass rules so social crawlers can fetch Open Graph HTML/images.
# Run from client/ with the project linked to production (aotracker).
set -euo pipefail

cd "$(dirname "$0")/../"

echo "Adding Vercel Firewall bypass rules for social crawlers…"

vercel firewall rules add "Bypass Discordbot (OpenGraph)" \
  --condition '{"type":"user_agent","op":"sub","value":"Discordbot"}' \
  --action bypass --yes

vercel firewall rules add "Bypass Twitterbot (OpenGraph)" \
  --condition '{"type":"user_agent","op":"sub","value":"Twitterbot"}' \
  --action bypass --yes

vercel firewall rules add "Bypass facebookexternalhit (OpenGraph)" \
  --condition '{"type":"user_agent","op":"sub","value":"facebookexternalhit"}' \
  --action bypass --yes

vercel firewall rules add "Bypass LinkedInBot (OpenGraph)" \
  --condition '{"type":"user_agent","op":"sub","value":"LinkedInBot"}' \
  --action bypass --yes

vercel firewall rules add "Bypass Slackbot (OpenGraph)" \
  --condition '{"type":"user_agent","op":"sub","value":"Slackbot"}' \
  --action bypass --yes

vercel firewall rules add "Bypass WhatsApp (OpenGraph)" \
  --condition '{"type":"user_agent","op":"sub","value":"WhatsApp"}' \
  --action bypass --yes

vercel firewall rules add "Bypass TelegramBot (OpenGraph)" \
  --condition '{"type":"user_agent","op":"sub","value":"TelegramBot"}' \
  --action bypass --yes

vercel firewall rules publish --yes

echo "Done. Test with:"
echo "  curl -A 'Discordbot/2.0' -sL 'https://www.aotracker.net/battle/americas/1430563153' | grep -i og:"
