defmodule Console.Repo.Migrations.AddWorkbenchPrompts do
  use Ecto.Migration

  def change do
    alter table(:workbench_crons) do
      add :user_id, references(:watchman_users, type: :uuid, on_delete: :delete_all)
    end

    create index(:workbench_crons, [:user_id])

    create table(:workbench_prompts, primary_key: false) do
      add :id,           :uuid, primary_key: true
      add :workbench_id, references(:workbenches, type: :uuid, on_delete: :delete_all)
      add :prompt,       :binary

      timestamps()
    end

    create index(:workbench_prompts, [:workbench_id])
  end
end
