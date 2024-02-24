defmodule Console.Repo.Migrations.AddNotificationRouting do
  use Ecto.Migration

  def change do
    create table(:notification_sinks, primary_key: false) do
      add :id,            :uuid, primary_key: true
      add :name,          :string
      add :type,          :integer
      add :configuration, :map

      timestamps()
    end

    create table(:notification_routers, primary_key: false) do
      add :id,     :uuid, primary_key: true
      add :name,   :string
      add :events, {:array, :string}

      timestamps()
    end

    create table(:router_sinks, primary_key: false) do
      add :id,        :uuid, primary_key: true
      add :sink_id,   references(:notification_sinks, type: :uuid, on_delete: :delete_all)
      add :router_id, references(:notification_routers, type: :uuid, on_delete: :delete_all)

      timestamps()
    end

    create table(:router_filters, primary_key: false) do
      add :id,          :uuid,  primary_key: true
      add :router_id,   references(:notification_routers, type: :uuid, on_delete: :delete_all)
      add :service_id,  references(:services,  type: :uuid, on_delete: :delete_all)
      add :cluster_id,  references(:clusters,  type: :uuid, on_delete: :delete_all)
      add :pipeline_id, references(:pipelines, type: :uuid, on_delete: :delete_all)

      timestamps()
    end

    create unique_index(:notification_sinks, [:name])
    create unique_index(:notification_routers, [:name])
    create index(:policy_bindings, [:policy_id])
    create index(:router_sinks, [:router_id])
  end
end
