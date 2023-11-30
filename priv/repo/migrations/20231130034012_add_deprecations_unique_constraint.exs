defmodule Console.Repo.Migrations.AddDeprecationsUniqueConstraint do
  use Ecto.Migration

  def change do
    drop index(:api_deprecations, [:component_id])
    create unique_index(:api_deprecations, [:component_id])
  end
end
