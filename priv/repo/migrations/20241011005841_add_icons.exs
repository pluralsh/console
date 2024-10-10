defmodule Console.Repo.Migrations.AddIcons do
  use Ecto.Migration

  def change do
    alter table(:catalogs) do
      add :icon,      :string
      add :dark_icon, :string
    end

    alter table(:pr_automations) do
      add :icon,      :string
      add :dark_icon, :string
    end
  end
end
