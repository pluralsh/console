defmodule Console.Repo.Migrations.AddVclusters do
  use Ecto.Migration

  def change do
    alter table(:clusters) do
      add :virtual, :boolean, default: false
      add :parent_cluster_id, references(:clusters, type: :uuid, on_delete: :delete_all)
    end

    create index(:clusters, [:parent_cluster_id])
  end
end
