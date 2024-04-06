defmodule Console.Repo.Migrations.AddStackDestroy do
  use Ecto.Migration

  def change do
    alter table(:stacks) do
      add :deleted_at, :utc_datetime_usec
      add :delete_run_id, references(:stack_runs, type: :uuid)
    end
  end
end
