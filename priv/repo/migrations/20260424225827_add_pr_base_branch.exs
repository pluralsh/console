defmodule Console.Repo.Migrations.AddPrBaseBranch do
  use Ecto.Migration

  def change do
    alter table(:workbench_skills) do
      add :subagents, {:array, :integer}
    end

    alter table(:pull_requests) do
      add :base, :string
    end
  end
end
