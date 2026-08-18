package plrl.binding

# Workbench.preloaded/0 and Stack.preloaded/0 include :project.
# Use this to attach a project-wide admission policy.

bind := true if input.project.name == "production"

bind := true if input.project.default == true
