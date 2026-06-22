defmodule Console.Repo.Migrations.AddAgentHeadBranch do
  use Ecto.Migration

  def change do
    alter table(:agent_runs) do
      add :head_branch, :string
    end
  end
end
