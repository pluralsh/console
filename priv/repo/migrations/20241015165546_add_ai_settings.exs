defmodule Console.Repo.Migrations.AddAiSettings do
  use Ecto.Migration

  def change do
    alter table(:deployment_settings) do
      add :ai, :map
    end
  end
end
