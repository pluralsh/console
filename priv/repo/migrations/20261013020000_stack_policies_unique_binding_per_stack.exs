defmodule Console.Repo.Migrations.StackPoliciesUniqueBindingPerStack do
  use Ecto.Migration

  def change do
    create unique_index(
      :stack_policies,
      [:binding_policy_id, :stack_id],
      where: "binding_policy_id IS NOT NULL",
      name: :stack_policies_binding_id_stack_id_index
    )
  end
end
