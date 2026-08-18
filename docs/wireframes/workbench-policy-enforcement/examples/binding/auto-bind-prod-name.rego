package plrl.binding

# Workbenches and stacks have no labels. Name is the stable signal.
# Input is Console.clean(workbench | stack) — see binding_input/1.

bind := true if startswith(input.name, "prod-")

bind := true if regex.match("(?i).*(prod|production).*", input.name)
