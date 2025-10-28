defmodule Console.Repo.Migrations.AddPrCreator do
  use Ecto.Migration

  def change do
    alter table(:pull_requests) do
      add :author_id, references(:watchman_users, type: :binary_id, on_delete: :nilify_all)
    end

    create index(:pull_requests, [:author_id])

    alter table(:pr_automations) do
      add :branch_prefix, :string
    end
  end
end
