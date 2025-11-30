defmodule Console.Repo.Migrations.AddPrAutomationLua do
  use Ecto.Migration

  def change do
    alter table(:pr_automations) do
      add :git, :map
      add :lua, :map
    end
  end
end
