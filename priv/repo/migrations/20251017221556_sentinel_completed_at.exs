defmodule Console.Repo.Migrations.SentinelCompletedAt do
  use Ecto.Migration

  def change do
    alter table(:sentinel_runs) do
      add :completed_at, :utc_datetime_usec
    end
  end
end
