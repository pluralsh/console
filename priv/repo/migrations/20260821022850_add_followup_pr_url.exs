defmodule Console.Repo.Migrations.AddFollowupPrUrl do
  use Ecto.Migration

  def change do
    alter table(:agent_runs) do
      add :followup_pr_url, :string
    end

    create table(:workbench_knowledge, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :workbench_id, references(:workbenches, type: :binary_id, on_delete: :delete_all)
      add :knowledge,    :binary
      add :name,         :string
      add :description,  :string
      add :labels,       {:array, :string}
      add :usages,       :integer, default: 0
      add :last_used_at, :utc_datetime_usec

      timestamps()
    end

    create unique_index(:workbench_knowledge, [:workbench_id, :name])
    create index(:workbench_knowledge, [:workbench_id])
  end
end
