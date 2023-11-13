defmodule Console.Repo.Migrations.AddDeletionProtection do
  use Ecto.Migration

  def change do
    alter table(:services) do
      add :protect, :boolean
    end
  end
end
