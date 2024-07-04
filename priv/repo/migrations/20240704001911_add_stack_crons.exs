defmodule Console.Repo.Migrations.AddStackCrons do
  use Ecto.Migration

  def change do
    create table(:stack_crons, primary_key: false) do
      add :id,           :uuid, primary_key: true
      add :stack_id,     references(:stacks, type: :uuid, on_delete: :delete_all)
      add :crontab,      :string
      add :auto_approve, :boolean
      add :next_run_at,  :utc_datetime_usec
      add :last_run_at,  :utc_datetime_usec

      timestamps()
    end

    create unique_index(:stack_crons, [:stack_id])
    create index(:stack_crons, [:next_run_at])
  end
end
