defmodule Console.GraphQl.Policies do
  use Console.GraphQl.Schema.Base
  alias Console.Middleware.{Authenticated, AdminRequired}
  alias Console.GraphQl.Resolvers.Policy

  ecto_enum :upgrade_policy_type, Console.Schema.UpgradePolicy.Type

  input_object :upgrade_policy_attributes do
    field :name,         non_null(:string)
    field :description,  :string
    field :target,       non_null(:string)
    field :type,         non_null(:upgrade_policy_type)
    field :repositories, list_of(:string)
    field :weight,       :integer
  end

  object :upgrade_policy do
    field :id,           non_null(:id)
    field :name,         non_null(:string)
    field :description,  :string
    field :repositories, list_of(:string)
    field :type,         non_null(:upgrade_policy_type)
    field :target,       non_null(:string)
    field :weight,       :integer

    timestamps()
  end

  object :policy_queries do
    field :upgrade_policies, list_of(:upgrade_policy) do
      middleware Authenticated

      resolve &Policy.upgrade_policies/2
    end
  end

  object :policy_mutations do
    field :create_upgrade_policy, :upgrade_policy do
      middleware Authenticated
      middleware AdminRequired

      arg :attributes, non_null(:upgrade_policy_attributes)

      resolve &Policy.create_upgrade_policy/2
    end

    field :delete_upgrade_policy, :upgrade_policy do
      middleware Authenticated
      middleware AdminRequired

      arg :id, non_null(:id)

      resolve safe_resolver(&Policy.delete_upgrade_policy/2)
    end
  end
end
