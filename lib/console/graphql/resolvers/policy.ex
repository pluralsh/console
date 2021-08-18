defmodule Console.GraphQl.Resolvers.Policy do
  use Console.GraphQl.Resolvers.Base, model: Console.Schema.UpgradePolicy
  alias Console.Services.Policies

  def upgrade_policies(_, _), do: {:ok, Policies.upgrade_policies()}

  def create_upgrade_policy(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Policies.create_upgrade_policy(attrs, user)

  def delete_upgrade_policy(%{id: id}, %{context: %{current_user: user}}),
    do: Policies.delete_upgrade_policy(id, user)
end
