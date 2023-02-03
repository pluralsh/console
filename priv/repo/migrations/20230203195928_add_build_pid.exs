defmodule Console.Repo.Migrations.AddBuildPid do
  use Ecto.Migration

  def change do
    alter table(:builds) do
      add :pid, :binary
    end
  end
end
