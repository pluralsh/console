defmodule Console.Repo.Migrations.AddRunbookExecutions do
  use Ecto.Migration

  def change do
    create table(:runbook_executions, primary_key: false) do
      add :id,        :uuid, primary_key: true
      add :name,      :string
      add :namespace, :string
      add :context,   :map
      add :user_id,   references(:watchman_users, type: :uuid, on_delete: :nilify_all)

      timestamps()
    end

    create index(:runbook_executions, [:namespace, :name])
  end
end
