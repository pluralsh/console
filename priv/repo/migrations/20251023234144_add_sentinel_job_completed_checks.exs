defmodule Console.Repo.Migrations.AddSentinelJobCompletedChecks do
  use Ecto.Migration

  def change do
    alter table(:sentinel_runs) do
      add :checks, :map
    end

    alter table(:sentinel_run_jobs) do
      add :completed_at, :utc_datetime_usec
    end
  end
end
