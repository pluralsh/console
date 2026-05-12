defmodule Console.Repo.Migrations.AddPrAutomationAiUpdate do
  use Ecto.Migration

  def change do
    alter table(:pr_automations) do
      add :ai, :map
    end
  end
end
