defmodule Console.Repo.Migrations.DropServiceIdFkey do
  use Ecto.Migration

  def change do
    execute "ALTER TABLE cluster_scaling_recommendations DROP CONSTRAINT cluster_scaling_recommendations_service_id_fkey"
  end
end
