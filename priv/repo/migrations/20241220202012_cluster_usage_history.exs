defmodule Console.Repo.Migrations.ClusterUsageHistory do
  use Ecto.Migration

  def change do
    create table(:cluster_usage_history, primary_key: false) do
      add :id, :uuid
      add :timestamp, :utc_datetime_usec
      add :cluster_id, references(:clusters, type: :uuid, on_delete: :delete_all)

      add :memory,      :float
      add :cpu,         :float
      add :storage,     :float
      add :gpu,         :float

      add :cpu_cost,           :float
      add :memory_cost,        :float
      add :gpu_cost,           :float
      add :node_cost,          :float
      add :control_plane_cost, :float
      add :storage_cost,       :float

      add :memory_util, :float
      add :cpu_util,    :float
      add :gpu_util,    :float

      add :load_balancer_cost, :float
      add :ingress_cost,       :float
      add :egress_cost,        :float

      timestamps()
    end

    create index(:cluster_usage_history, [:cluster_id])
    create index(:cluster_usage_history, [:cluster_id, :timestamp])
  end
end
