defmodule Console.Repo.Migrations.AddRecurseSubmodules do
  use Ecto.Migration

  def change do
    alter table(:git_repositories) do
      add :recurse_submodules, :boolean, default: false
    end
  end
end
