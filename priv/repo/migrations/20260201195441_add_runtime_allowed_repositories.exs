defmodule Console.Repo.Migrations.AddRuntimeAllowedRepositories do
  use Ecto.Migration

  def change do
    alter table(:agent_runtimes) do
      add :allowed_repositories, {:array, :string}
      add :connection_id, references(:scm_connections, type: :uuid, on_delete: :nilify_all)
    end

    create index(:agent_runtimes, [:connection_id])
  end
end
