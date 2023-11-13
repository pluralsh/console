defmodule Console.Repo.Migrations.AddClusterHandle do
  use Ecto.Migration

  def change do
    alter table(:clusters) do
      add :handle, :string
    end

    create unique_index(:clusters, [:handle])
  end
end
