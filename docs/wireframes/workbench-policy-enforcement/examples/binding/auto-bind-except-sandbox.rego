package plrl.binding

# Attach everywhere except scratch / sandbox / local-dev workbenches.
# Do not redefine `default bind` — the base policy already defaults to false.

sandbox if regex.match("(?i).*(sandbox|scratch|dev-local).*", input.name)

bind := true if not sandbox
