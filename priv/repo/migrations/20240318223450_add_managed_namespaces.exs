defmodule Console.Repo.Migrations.AddManagedNamespaces do
  use Ecto.Migration

  def change do
    create table(:managed_namespaces, primary_key: false) do
      add :id,           :uuid, primary_key: true
      add :name,         :string
      add :description,  :string
      add :labels,       :map
      add :annotations,  :map
      add :pull_secrets, {:array, :string}
      add :target,       :map
      add :service,      :map
      add :deleted_at,   :utc_datetime_usec

      timestamps()
    end

    create table(:namespace_instances, primary_key: false) do
      add :id,           :uuid, primary_key: true
      add :cluster_id,   references(:clusters, type: :uuid, on_delete: :delete_all)
      add :service_id,   references(:services, type: :uuid, on_delete: :delete_all)
      add :namespace_id, references(:managed_namespaces, type: :uuid, on_delete: :delete_all)

      timestamps()
    end

    create table(:namespace_clusters, primary_key: false) do
      add :id,           :uuid, primary_key: true
      add :namespace_id, references(:managed_namespaces, type: :uuid, on_delete: :delete_all)
      add :cluster_id,   references(:clusters, type: :uuid, on_delete: :delete_all)

      timestamps()
    end

    create unique_index(:namespace_instances, [:namespace_id, :cluster_id])
    create index(:namespace_instances, [:cluster_id])

    create unique_index(:namespace_clusters, [:namespace_id, :cluster_id])
    create index(:namespace_clusters, [:cluster_id])
  end
end
