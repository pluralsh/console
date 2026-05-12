defmodule Console.Repo.Migrations.AddIssueAlertWorkbenchWebhookId do
  use Ecto.Migration

  def change do
    alter table(:workbench_webhooks) do
      add :user_id, references(:watchman_users, type: :uuid, on_delete: :nilify_all)
    end

    create index(:workbench_webhooks, [:user_id])

    alter table(:alerts) do
      add :workbench_webhook_id, references(:workbench_webhooks, type: :uuid, on_delete: :nilify_all)
    end

    create index(:alerts, [:workbench_webhook_id])

    alter table(:issues) do
      add :workbench_webhook_id, references(:workbench_webhooks, type: :uuid, on_delete: :nilify_all)
    end

    create index(:issues, [:workbench_webhook_id])
  end
end
