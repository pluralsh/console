defmodule Console.Repo.Migrations.AddAlerts do
  use Ecto.Migration

  def change do
    create table(:alerts, primary_key: false) do
      add :id,          :uuid,   primary_key: true
      add :type,        :integer
      add :title,       :string
      add :state,       :integer
      add :message,     :binary
      add :fingerprint, :string
      add :severity,    :integer
      add :annotations, :map
      add :url,         :string

      add :project_id, references(:projects, type: :uuid, on_delete: :delete_all)
      add :cluster_id, references(:clusters, type: :uuid, on_delete: :delete_all)
      add :service_id, references(:services, type: :uuid, on_delete: :delete_all)

      timestamps()
    end

    create unique_index(:alerts, [:fingerprint])

    create table(:observability_webhooks, primary_key: false) do
      add :id,          :uuid, primary_key: true
      add :name,        :name
      add :type,        :integer
      add :external_id, :string
      add :secret,      :string

      timestamps()
    end

    create unique_index(:observability_webhooks, [:external_id])
    create unique_index(:observability_webhooks, [:name])

    alter table(:tags) do
      add :alert_id, references(:alerts, type: :uuid, on_delete: :delete_all)
    end

    create unique_index(:tags, [:alert_id, :name])
    create index(:tags, [:alert_id])
  end
end
