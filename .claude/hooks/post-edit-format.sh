#!/usr/bin/env bash
# PostToolUse hook (Write|Edit|MultiEdit): formats the changed file with the
# Prettier installed in whichever workspace (apps/web or apps/api) it belongs to.
set -u

input="$(cat)"
file="$(printf '%s' "$input" | node -e '
let d="";
process.stdin.on("data", c => d += c);
process.stdin.on("end", () => {
  try {
    const j = JSON.parse(d);
    process.stdout.write(j.tool_input && j.tool_input.file_path ? j.tool_input.file_path : "");
  } catch (e) {}
});
')"

[ -n "$file" ] || exit 0
[ -f "$file" ] || exit 0

root="${CLAUDE_PROJECT_DIR:-$(pwd)}"

case "$file" in
  *apps/web/*) workspace_dir="$root/apps/web" ;;
  *apps/api/*) workspace_dir="$root/apps/api" ;;
  *) exit 0 ;;
esac

[ -f "$workspace_dir/node_modules/.bin/prettier" ] || exit 0

(cd "$workspace_dir" && npx --no-install prettier --write "$file") >/dev/null 2>&1 || true
