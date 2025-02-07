defmodule Console.Repo.Migrations.AddOperationalLayout do
  use Ecto.Migration

  def change do
    create table(:operational_layouts, primary_key: false) do
      add :id, :uuid, primary_key: false
      add :cluster_id, references(:clusters, type: :uuid, on_delete: :delete_all)
      add :namespaces, :map
      timestamps()
    end

    create unique_index(:operational_layouts, [:cluster_id])
  end
end
