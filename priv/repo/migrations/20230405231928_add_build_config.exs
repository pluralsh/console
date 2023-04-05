defmodule Console.Repo.Migrations.AddBuildConfig do
  use Ecto.Migration

  def change do
    alter table(:builds) do
      add :config, :map
    end
  end
end
