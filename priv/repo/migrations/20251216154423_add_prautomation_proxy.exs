defmodule Console.Repo.Migrations.AddPrautomationProxy do
  use Ecto.Migration

  def change do
    alter table(:pr_automations) do
      add :proxy, :map
    end
  end
end
