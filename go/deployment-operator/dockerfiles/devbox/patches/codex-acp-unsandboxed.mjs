// Takes Codex's own sandbox out of codex-acp's session modes: the devbox is the sandbox, and Codex's (no network,
// writes only under the workspace) breaks package downloads through the box's egress proxy. Without a sandbox to
// escalate out of, `on-request` never asks, so the asking modes ask about everything not known to be safe.
//
//   node codex-acp-unsandboxed.mjs <codex-acp dist/index.js>
//
// Fails when the mode definitions changed shape, so an adapter bump can't silently bring the sandbox back.
import { readFileSync, writeFileSync } from 'node:fs'

const [file] = process.argv.slice(2)
const src = readFileSync(file, 'utf8')
const sandboxed =
  /"on-request",(\s*"(?:user|auto_review)",\s*)\{\s*type: "workspaceWrite",[^}]*\},\s*"workspace-write"/g
const found = src.match(sandboxed)?.length ?? 0
if (found !== 2) {
  console.error(`${file}: expected the read-only and agent modes' sandbox, found ${found}`)
  process.exit(1)
}
writeFileSync(file, src.replace(sandboxed, '"untrusted",$1{ type: "dangerFullAccess" },\n    "danger-full-access"'))
