package plrl.binding

# Only attach when the workbench is configured for cluster access.

bind := true if input.configuration.infrastructure.kubernetes == true
