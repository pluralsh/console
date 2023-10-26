defmodule Console.Repo.Migrations.AddPipelineGates do
  use Ecto.Migration

  def change do
    create table(:pipeline_gates, primary_key: false) do
      add :id,          :uuid, primary_key: true
      add :name,        :string
      add :type,        :integer, nil: false
      add :state,       :integer, default: 2
      add :edge_id,     references(:pipeline_edges, type: :uuid, on_delete: :delete_all)
      add :cluster_id,  references(:clusters, type: :uuid, on_delete: :delete_all)
      add :approver_id, references(:watchman_users, type: :uuid, on_delete: :nilify_all)
      add :spec,        :map

      timestamps()
    end

    create index(:pipeline_gates, [:edge_id])
    create index(:pipeline_gates, [:cluster_id])
    create unique_index(:pipeline_gates, [:edge_id, :name])
  end
end
