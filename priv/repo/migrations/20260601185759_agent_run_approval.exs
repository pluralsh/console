defmodule Console.Repo.Migrations.AgentRunApproval do
  use Ecto.Migration

  def change do
    alter table(:agent_runs) do
      add :approval,    :boolean, default: false
      add :approved_at, :utc_datetime_usec
    end

    alter table(:workbench_jobs) do
      add :modes, :map
    end
  end
end
