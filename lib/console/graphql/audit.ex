defmodule Console.GraphQl.Audit do
  use Console.GraphQl.Schema.Base
  alias Console.GraphQl.Resolvers.{User, Audit}
  alias Console.Schema

  ecto_enum :audit_type, Schema.Audit.Type
  ecto_enum :audit_action, Schema.Audit.Action

  object :audit do
    field :id, non_null(:id)
    field :action, non_null(:audit_action)
    field :type, non_null(:audit_type)
    field :repository, :string

    field :actor, :user, resolve: dataloader(User)

    timestamps()
  end

  connection node_type: :audit

  object :audit_queries do
    connection field :audits, node_type: :audit do
      arg :repo, :string

      resolve &Audit.list_audits/2
    end
  end
end
