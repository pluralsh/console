defmodule Console.Repo.Migrations.IndexBindingPoliciesBindPolicyId do
  use Ecto.Migration

  def change do
    create index(:binding_policies, [:bind_policy_id])
  end
end
