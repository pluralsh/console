defmodule Console.Repo.Migrations.AddCatalogCreatePolicy do
  use Ecto.Migration

  def change do
    alter table(:catalogs) do
      add :create_policy_id, :uuid
    end
  end
end
