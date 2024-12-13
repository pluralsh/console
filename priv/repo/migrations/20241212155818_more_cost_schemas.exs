defmodule Console.Repo.Migrations.MoreCostSchemas do
  use Ecto.Migration

  def change do
    alter table(:cluster_usage) do
      add :gpu,      :float
      add :gpu_util, :float

      add :cpu_cost,    :float
      add :memory_cost, :float
      add :gpu_cost,    :float

      add :load_balancer_cost, :float
      add :ingress_cost,       :float
      add :egress_cost,        :float
    end

    alter table(:cluster_namespace_usage) do
      add :gpu,      :float
      add :gpu_util, :float

      add :cpu_cost,    :float
      add :memory_cost, :float
      add :gpu_cost,    :float

      add :load_balancer_cost, :float
      add :ingress_cost,       :float
      add :egress_cost,        :float
    end

    alter table(:cluster_scaling_recommendations) do
      add :cpu_cost,    :float
      add :memory_cost, :float
      add :gpu_cost,    :float
    end
  end
end
