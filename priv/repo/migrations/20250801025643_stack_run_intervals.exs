defmodule Console.Repo.Migrations.StackRunIntervals do
  use Ecto.Migration

  def change do
    alter table(:stacks) do
      add :interval, :string
      add :next_poll_at, :utc_datetime_usec
    end

    alter table(:global_services) do
      add :interval, :string
      add :next_poll_at, :utc_datetime_usec
    end

    alter table(:pull_requests) do
      add :next_poll_at, :utc_datetime_usec
    end

    create index(:stacks, [:next_poll_at])
    create index(:global_services, [:next_poll_at])
    create index(:pull_requests, [:next_poll_at])
  end
end
