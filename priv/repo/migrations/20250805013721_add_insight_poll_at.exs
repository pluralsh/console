defmodule Elixir.Console.Repo.Migrations.AddInsightPollAt do
  use Ecto.Migration

  def change do
    alter table(:services) do
      add :ai_poll_at, :utc_datetime_usec
    end

    create index(:services, [:ai_poll_at])

    alter table(:clusters) do
      add :ai_poll_at, :utc_datetime_usec
    end

    create index(:clusters, [:ai_poll_at])

    alter table(:stacks) do
      add :ai_poll_at, :utc_datetime_usec
    end

    create index(:stacks, [:ai_poll_at])

    alter table(:alerts) do
      add :ai_poll_at, :utc_datetime_usec
    end

    create index(:alerts, [:ai_poll_at])
  end
end
