defmodule Console.Repo.Migrations.AddRuntimeServices do
  use Ecto.Migration

  def change do
    create table(:runtime_services, primary_key: false) do
      add :id,      :uuid, primary_key: true
      add :name,    :string
      add :version, :string

      add :service_id, references(:services, type: :uuid, on_delete: :nilify_all)
      add :cluster_id, references(:clusters, type: :uuid, on_delete: :delete_all)

      timestamps()
    end

    create index(:runtime_services, [:cluster_id])
    create index(:runtime_services, [:service_id])
    create unique_index(:runtime_services, [:cluster_id, :name])
  end
end
