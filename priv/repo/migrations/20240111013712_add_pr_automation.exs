defmodule Console.Repo.Migrations.AddPrAutomation do
  use Ecto.Migration

  def change do
    create table(:scm_connections, primary_key: false) do
      add :id,       :uuid, primary_key: true
      add :type,     :integer
      add :name,     :string
      add :base_url, :string
      add :api_url,  :string
      add :token,    :binary
      add :username, :string

      timestamps()
    end

    create table(:scm_webhooks, primary_key: false) do
      add :id,          :uuid, primary_key: true
      add :type,        :integer
      add :hmac,        :binary
      add :external_id, :string

      timestamps()
    end

    create table(:pr_automations, primary_key: false) do
      add :id,            :uuid, primary_key: true
      add :name,          :string
      add :documentation, :binary
      add :addon,         :string
      add :identifier,    :string
      add :message,       :binary
      add :cluster_id,    references(:clusters, type: :uuid, on_delete: :nilify_all)
      add :service_id,    references(:services, type: :uuid, on_delete: :nilify_all)
      add :connection_id, references(:scm_connections, type: :uuid, on_delete: :delete_all)
      add :spec,          :map

      timestamps()
    end

    alter table(:services) do
      add :dry_run,  :boolean
      add :interval, :string
    end

    create table(:component_contents, primary_key: false) do
      add :id,           :uuid, primary_key: true
      add :live,         :binary
      add :desired,      :binary
      add :component_id, references(:service_components, type: :uuid, on_delete: :delete_all)

      timestamps()
    end

    create unique_index(:scm_connections, [:name])
    create unique_index(:pr_automations, [:name])
    create unique_index(:scm_webhooks, [:external_id])
    create index(:pr_automations, [:addon])
    create index(:pr_automations, [:cluster_id])
    create index(:pr_automations, [:service_id])
    create unique_index(:component_contents, [:component_id])
  end
end
