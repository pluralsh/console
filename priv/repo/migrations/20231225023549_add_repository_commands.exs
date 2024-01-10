defmodule Console.Repo.Migrations.AddRepositoryCommands do
  use Ecto.Migration

  def change do
    alter table(:git_repositories) do
      add :decrypt, :boolean
    end
  end
end
