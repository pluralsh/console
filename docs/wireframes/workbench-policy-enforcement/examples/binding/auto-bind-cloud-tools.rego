package plrl.binding

# tools are preloaded on the workbench. `tool` is the WorkbenchTool enum
# (cloud, azure, lambda, github, pagerduty, …).

bind := true if {
  some tool in input.tools
  tool.tool in {"cloud", "azure", "lambda", "cloud_run", "azure_function"}
}
