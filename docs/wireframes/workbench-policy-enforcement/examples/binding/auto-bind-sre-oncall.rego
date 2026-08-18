package plrl.binding

# Incident / on-call workbenches get the destructive-tool guard.

bind := true if regex.match("(?i).*(sre|oncall|incident|sev[1-3]).*", input.name)

bind := true if regex.match("(?i).*(sre|oncall|incident).*", input.description)
