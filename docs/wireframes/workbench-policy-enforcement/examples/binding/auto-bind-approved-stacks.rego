package plrl.binding

# Prod stacks that require human approval also get plan-gate enforcement.
# Paused stacks are skipped so we do not attach while they are idle.

bind := true if {
  input.approval == true
  input.paused != true
}
