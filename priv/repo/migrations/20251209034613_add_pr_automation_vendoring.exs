defmodule Console.Repo.Migrations.AddPrAutomationVendoring do
  use Ecto.Migration

  def change do
    alter table(:pr_automations) do
      add :vendor, :map
    end
  end
end
