defmodule Console.Repo.Migrations.AddAgentSessionAdditionalState do
  use Ecto.Migration

  def change do
    alter table(:agent_sessions) do
      add :stack_id,        references(:stacks, type: :uuid, on_delete: :nilify_all)
      add :pull_request_id, references(:pull_requests, type: :uuid, on_delete: :nilify_all)
      add :prompt,          :binary
      add :branch,          :string
      add :initialized,     :boolean, default: false
      add :commit_count,    :integer, default: 0
    end

    alter table(:pull_requests) do
      add :session_id, references(:agent_sessions, type: :uuid, on_delete: :nilify_all)
    end

    create index(:agent_sessions, [:pull_request_id])
  end
end
