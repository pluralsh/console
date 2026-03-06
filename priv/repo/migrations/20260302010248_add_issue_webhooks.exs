defmodule Console.Repo.Migrations.AddIssueWebhooks do
  use Ecto.Migration

  def change do
    create table(:issue_webhooks, primary_key: false) do
      add :id,          :uuid, primary_key: true
      add :external_id, :string
      add :provider,    :integer
      add :url,         :string
      add :name,        :string
      add :secret,      :string

      timestamps()
    end

    create unique_index(:issue_webhooks, [:url])
    create unique_index(:issue_webhooks, [:external_id])
    create unique_index(:issue_webhooks, [:name])

    create table(:issues, primary_key: false) do
      add :id,          :uuid, primary_key: true
      add :provider,    :integer
      add :status,      :integer
      add :external_id, :string
      add :title,       :string
      add :body,        :string
      add :url,         :string

      add :workbench_id, references(:workbenches, type: :uuid, on_delete: :delete_all)
      add :flow_id, references(:flows, type: :uuid, on_delete: :delete_all)

      timestamps()
    end

    create index(:issues, [:provider])
    create index(:issues, [:status])
    create unique_index(:issues, [:external_id])

    alter table(:workbench_webhooks) do
      add :issue_webhook_id, references(:issue_webhooks, type: :uuid, on_delete: :delete_all)
    end

    create index(:workbench_webhooks, [:issue_webhook_id])

    alter table(:workbench_jobs) do
      add :issue_id, references(:issues, type: :uuid, on_delete: :nilify_all)
      add :alert_id, references(:alerts, type: :uuid, on_delete: :nilify_all)
    end

    create index(:workbench_jobs, [:issue_id])
    create index(:workbench_jobs, [:alert_id])
  end
end
