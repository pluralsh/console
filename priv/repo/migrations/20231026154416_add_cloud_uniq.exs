defmodule Console.Repo.Migrations.AddCloudUniq do
  use Ecto.Migration

  def change do
    create unique_index(:cluster_providers, [:cloud])
  end
end
