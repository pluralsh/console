defmodule Console.Repo.Migrations.AddProxyColumns do
  use Ecto.Migration

  def change do
    alter table(:scm_connections) do
      add :proxy, :map
    end

    alter table(:git_repositories) do
      add :proxy, :map
    end
  end
end
