defmodule Console.GraphQl.Plural do
  use Console.GraphQl.Schema.Base
  alias Console.GraphQl.Resolvers.Plural

  object :account do
    datetime_func :delinquent_at, :delinquentAt
    datetime_func :grandfathered_until, :grandfatheredUntil
    key_func :available_features, :available_features, :availableFeatures
    field :subscription, :plural_subscription
  end

  object :plural_subscription do
    field :id,   :id
    field :plan, :plan
  end

  object :plan do
    field :id,     :id
    field :name,   :string
    field :period, :string
  end

  object :plural_queries do
    field :account, :account do
      middleware Authenticated

      resolve &Plural.account/2
    end
  end
end
