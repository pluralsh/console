defmodule Console.Repo.Migrations.OptimizationIndices do
  use Ecto.Migration

  def change do
    create index(:clusters, [:self])
    create index(:clusters, [:read_policy_id])
    create index(:clusters, [:write_policy_id])
    create index(:services, [:read_policy_id])
    create index(:services, [:write_policy_id])
  end
end
