defmodule Console.Repo.Migrations.AddRecommendationUtils do
  use Ecto.Migration

  def change do
    alter table(:cluster_scaling_recommendations) do
      add :cpu_util,    :float
      add :memory_util, :float
    end
  end
end
