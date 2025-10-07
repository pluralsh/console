defmodule Console.Repo.Migrations.AddAiApproval do
  use Ecto.Migration

  def change do
    alter table(:stack_runs) do
      add :approval_result, :map
    end
  end
end
