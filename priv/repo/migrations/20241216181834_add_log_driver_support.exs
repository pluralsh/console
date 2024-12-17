defmodule Console.Repo.Migrations.AddLogDriverSupport do
  use Ecto.Migration

  def change do
    alter table(:deployment_settings) do
      add :logging, :map
    end
  end
end
