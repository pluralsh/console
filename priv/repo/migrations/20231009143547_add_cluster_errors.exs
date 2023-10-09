defmodule Console.Repo.Migrations.AddClusterErrors do
  use Ecto.Migration

  def change do
    alter table(:service_errors) do
      add :cluster_id, references(:clusters, type: :uuid, on_delete: :delete_all)
    end

    create index(:service_errors, [:cluster_id])
  end
end
