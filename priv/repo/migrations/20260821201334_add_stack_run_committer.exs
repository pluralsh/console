defmodule Console.Repo.Migrations.AddStackRunCommitter do
  use Ecto.Migration

  def change do
    alter table(:stack_runs) do
      add :committer, :string
    end

    alter table(:stack_policies) do
      add :type, :integer, default: 0
    end
  end
end
