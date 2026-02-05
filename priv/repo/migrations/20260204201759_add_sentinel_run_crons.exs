defmodule Console.Repo.Migrations.AddSentinelRunCrons do
  use Ecto.Migration

  def change do
    alter table(:sentinels) do
      add :crontab,     :string
      add :next_run_at, :utc_datetime_usec
    end

    create index(:sentinels, [:next_run_at])
  end
end
