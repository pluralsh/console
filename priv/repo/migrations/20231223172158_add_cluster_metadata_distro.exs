defmodule Console.Repo.Migrations.AddClusterMetadataDistro do
  use Ecto.Migration

  def change do
    alter table(:clusters) do
      add :distro,   :integer, default: 0
      add :metadata, :map
    end

    create index(:clusters, [:distro])
  end
end
