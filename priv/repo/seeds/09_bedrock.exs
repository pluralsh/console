import Botanist

alias Console.Deployments.Init

seed do
  Init.migrate_bedrock()
end
