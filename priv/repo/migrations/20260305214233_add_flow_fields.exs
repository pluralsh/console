defmodule Console.Repo.Migrations.AddFlowFields do
  use Ecto.Migration

  def change do
    alter table(:flows) do
      add :metadata,         :map
      add :agent_runtime_id, references(:agent_runtimes, type: :uuid, on_delete: :nilify_all)
    end

    create index(:flows, [:agent_runtime_id])

    create table(:flow_workbenches, primary_key: false) do
      add :id,           :uuid, primary_key: true
      add :flow_id,      references(:flows, type: :uuid, on_delete: :delete_all)
      add :workbench_id, references(:workbenches, type: :uuid, on_delete: :delete_all)

      timestamps()
    end

    create unique_index(:flow_workbenches, [:flow_id, :workbench_id])
    create index(:flow_workbenches, [:flow_id])
    create index(:flow_workbenches, [:workbench_id])
  end
end
