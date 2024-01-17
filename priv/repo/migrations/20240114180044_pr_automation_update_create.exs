defmodule Console.Repo.Migrations.PrAutomationUpdateCreate do
  use Ecto.Migration

  def change do
    alter table(:pr_automations) do
      add :updates, :map
      add :creates, :map
    end
  end
end
