defmodule Console.Repo.Migrations.AddPullRequestStack do
  use Ecto.Migration

  def change do
    alter table(:pull_requests) do
      add :ref,      :string
      add :sha,      :string
      add :stack_id, references(:stacks, type: :uuid, on_delete: :nilify_all)
    end

    alter table(:stack_runs) do
      add :pull_request_id, references(:pull_requests, type: :uuid, on_delete: :nilify_all)
    end

    alter table(:stacks) do
      add :connection_id, references(:scm_connections, type: :uuid, on_delete: :nilify_all)
    end
  end
end
