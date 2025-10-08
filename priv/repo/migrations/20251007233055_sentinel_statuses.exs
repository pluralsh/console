defmodule Console.Repo.Migrations.SentinelStatuses do
  use Ecto.Migration

  def change do
    alter table(:sentinels) do
      add :status, :integer
      add :last_run_at, :utc_datetime_usec
    end
  end
end
