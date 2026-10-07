defmodule Console.Repo.Migrations.AddOauthClientWbTool do
  use Ecto.Migration

  def change do
    alter table(:workbench_tools) do
      add :oauth, :map
    end
  end
end
