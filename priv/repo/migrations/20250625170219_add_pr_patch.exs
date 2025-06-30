defmodule Console.Repo.Migrations.AddPrPatch do
  use Ecto.Migration

  def change do
    alter table(:pull_requests) do
      add :patch, :binary
    end

    alter table(:pr_automations) do
      add :patch, :boolean, default: false
    end
  end
end
