defmodule Console.Repo.Migrations.AddBuildContext do
  use Ecto.Migration

  def change do
    alter table(:builds) do
      add :context, :map
    end
  end
end
