defmodule Console.Repo.Migrations.AddPrAutomationBranch do
  use Ecto.Migration

  def change do
    alter table(:pr_automations) do
      add :branch, :string
      add :title,  :string
    end
  end
end
