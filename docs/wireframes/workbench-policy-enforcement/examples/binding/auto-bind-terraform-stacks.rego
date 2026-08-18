package plrl.binding

# Stack input uses Stack.preloaded([:project]). `type` is terraform | terragrunt |
# pulumi | ansible | …

bind := true if input.type == "terraform"

bind := true if input.type == "terragrunt"
