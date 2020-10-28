defmodule Watchman.Repo.Migrations.AddBuildSha do
  use Ecto.Migration

  def change do
    alter table(:builds) do
      add :sha, :string
    end
  end
end
