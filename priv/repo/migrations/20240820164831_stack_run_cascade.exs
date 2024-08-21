defmodule Console.Repo.Migrations.StackRunCascade do
  use Ecto.Migration

  def change do
    alter table(:stack_runs) do
      modify :cluster_id, references(:clusters, type: :uuid, on_delete: :delete_all),
        from: references(:clusters, type: :uuid)
    end
  end
end
