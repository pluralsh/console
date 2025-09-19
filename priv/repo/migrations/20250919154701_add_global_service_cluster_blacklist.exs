defmodule Console.Repo.Migrations.AddGlobalServiceClusterBlacklist do
  use Ecto.Migration

  def change do
    alter table(:global_services) do
      add :ignore_clusters, {:array, :uuid}
    end
  end
end
