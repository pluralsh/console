defmodule Console.Repo.Migrations.AddAgentRunPlan do
  use Ecto.Migration

  def change do
    alter table(:agent_runs) do
      add :todos,    :map
      add :analysis, :map
      add :mode,     :integer, default: 1
      add :error,    :binary
    end
  end
end
