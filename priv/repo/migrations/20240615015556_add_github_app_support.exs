defmodule Console.Repo.Migrations.AddGithubAppSupport do
  use Ecto.Migration

  def change do
    alter table(:scm_connections) do
      add :github, :map
    end

    alter table(:git_repositories) do
      add :connection_id, references(:scm_connections, type: :uuid, on_delete: :nilify_all)
    end
  end
end
