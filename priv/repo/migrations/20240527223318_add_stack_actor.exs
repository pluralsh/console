defmodule Console.Repo.Migrations.AddStackActor do
  use Ecto.Migration

  def change do
    alter table(:stacks) do
      add :actor_id, references(:watchman_users, type: :uuid, on_delete: :nilify_all)
    end

    alter table(:stack_runs) do
      add :actor_id, references(:watchman_users, type: :uuid, on_delete: :nilify_all)
      add :job_ref,  :map
    end
  end
end
