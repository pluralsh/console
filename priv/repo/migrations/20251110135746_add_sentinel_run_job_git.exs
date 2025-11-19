defmodule Console.Repo.Migrations.AddSentinelRunJobGit do
  use Ecto.Migration

  def change do
    alter table(:sentinel_run_jobs) do
      add :repository_id, references(:git_repositories, type: :uuid, on_delete: :nilify_all)
      add :git, :map
    end

    create index(:sentinel_run_jobs, [:repository_id])
  end
end
