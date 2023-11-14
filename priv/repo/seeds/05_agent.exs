import Botanist

alias Console.Schema.AgentMigration

seed do
  %AgentMigration{}
  |> AgentMigration.changeset()
  |> Console.Repo.update()
end
