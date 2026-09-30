defmodule Console.Repo.Migrations.StackPoliciesUniqueByType do
  use Ecto.Migration

  def change do
    drop unique_index(:stack_policies, [:policy_id, :stack_id])
    create unique_index(:stack_policies, [:policy_id, :stack_id, :type])
  end
end
