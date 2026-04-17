defmodule Console.Repo.Migrations.AddWorkbenchBotUser do
  use Ecto.Migration

  def change do
    alter table(:workbenches) do
      add :bot_user_id, references(:watchman_users, type: :uuid, on_delete: :nilify_all)
    end

    create index(:workbenches, [:bot_user_id])

    alter table(:agent_runs) do
      add :babysit,          :boolean, default: false
      add :babysit_interval, :integer
    end

    alter table(:agent_runtimes) do
      add :babysit_interval, :integer
    end
  end
end
