defmodule Console.Repo.Migrations.AddWbVerificationFields do
  use Ecto.Migration

  def change do
    alter table(:pull_requests) do
      add :stack_run_id, references(:stack_runs, type: :uuid, on_delete: :nothing)
    end

    create index(:pull_requests, [:stack_run_id])
  end
end
