defmodule Console.Repo.Migrations.AddWorkbenchWebhooksCrons do
  use Ecto.Migration

  def change do
    create table(:workbench_webhooks, primary_key: false) do
      add :id,           :uuid, primary_key: true
      add :name,         :string
      add :webhook_id,   references(:observability_webhooks, type: :uuid, on_delete: :delete_all)
      add :workbench_id, references(:workbenches, type: :uuid, on_delete: :delete_all)
      add :matches,      :map

      timestamps()
    end

    create unique_index(:workbench_webhooks, [:workbench_id, :name])
    create index(:workbench_webhooks, [:workbench_id])
    create index(:workbench_webhooks, [:webhook_id])

    create table(:workbench_crons, primary_key: false) do
      add :id,           :uuid, primary_key: true
      add :workbench_id, references(:workbenches, type: :uuid, on_delete: :delete_all)
      add :crontab,      :string
      add :prompt,       :binary
      add :next_run_at,  :utc_datetime_usec
      add :last_run_at,  :utc_datetime_usec

      timestamps()
    end

    create index(:workbench_crons, [:workbench_id])
    create index(:workbench_crons, [:workbench_id, :next_run_at])

    alter table(:alerts) do
      add :workbench_id, references(:workbenches, type: :uuid, on_delete: :nilify_all)
    end

    create index(:alerts, [:workbench_id])
  end
end
