defmodule Console.Repo.Migrations.AddPrMergeCron do
  use Ecto.Migration

  def change do
    alter table(:pull_requests) do
      add :merge_cron,       :string
      add :merge_attempt_at, :utc_datetime_usec
    end

    create index(:pull_requests, [:merge_attempt_at])
  end
end
