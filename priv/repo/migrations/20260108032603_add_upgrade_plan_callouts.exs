defmodule Console.Repo.Migrations.AddUpgradePlanCallouts do
  use Ecto.Migration

  def change do
    create table(:upgrade_plan_callouts, primary_key: false) do
      add :id,       :uuid, primary_key: true
      add :name,     :string, null: false
      add :callouts, :map
      add :context,  :map

      timestamps()
    end

    create unique_index(:upgrade_plan_callouts, [:name])

    create table(:custom_compatibility_matrices, primary_key: false) do
      add :id,          :uuid, primary_key: true
      add :name,        :string, null: false
      add :icon,        :string
      add :git_url,     :string
      add :release_url, :string
      add :readme_url,  :string
      add :versions,    :map

      timestamps()
    end

    create unique_index(:custom_compatibility_matrices, [:name])
  end
end
