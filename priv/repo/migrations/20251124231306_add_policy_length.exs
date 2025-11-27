defmodule Console.Repo.Migrations.AddPolicyLength do
  use Ecto.Migration

  def change do
    alter table(:policy_constraints) do
      modify :name, :string, size: 1_000
      modify :description, :string, size: 1_000
    end

    alter table(:constraint_violations) do
      modify :name, :string, size: 1_000
      modify :message, :string, size: 1_000
    end
  end
end
