package plrl.binding

# Attach when the workbench can write to a production-shaped git repo.

bind := true if {
  some repo in input.configuration.coding.repositories
  regex.match("(?i).*(prod|production|payments|platform).*", repo)
}
