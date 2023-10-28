defmodule Console.Repo.Migrations.AddClusterDeletionProtection do
  use Ecto.Migration

  def change do
    alter table(:clusters) do
      add :protect, :boolean, default: false
    end
  end
end
