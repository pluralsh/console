defmodule Console.GraphQl.Deployments.Policy do
  use Console.GraphQl.Schema.Base
  alias Console.GraphQl.Resolvers.Deployments

  enum :constraint_violation_field do
    value :namespace
    value :kind
  end

  @desc "inputs to add constraint data from an OPA gatekeeper constraint CRD"
  input_object :policy_constraint_attributes do
    field :name,            non_null(:string)
    field :description,     :string
    field :recommendation,  :string
    field :violation_count, :integer
    field :ref,             :constraint_ref_attributes, description: "pointer to the group/name for the CR"
    field :violations,      list_of(:violation_attributes)
  end

  input_object :constraint_ref_attributes do
    field :kind, non_null(:string)
    field :name, non_null(:string)
  end

  input_object :violation_attributes do
    field :group,     :string
    field :version,   :string
    field :kind,      :string
    field :namespace, :string
    field :name,      :string
    field :message,   :string
  end

  @desc "A OPA Gatekeeper Constraint reference"
  object :policy_constraint do
    field :id,              non_null(:id)
    field :name,            non_null(:string)
    field :description,     :string
    field :recommendation,  :string
    field :violation_count, :integer

    field :object, :kubernetes_unstructured,
      description: "Fetches the live constraint object from K8s, this is an expensive query and should not be done in list endpoints",
      resolve: &Deployments.fetch_constraint/3

    field :ref, :constraint_ref, description: "pointer to the kubernetes resource itself"

    field :violations, list_of(:violation), resolve: dataloader(Deployments)

    timestamps()
  end

  object :constraint_ref do
    field :kind, non_null(:string)
    field :name, non_null(:string)
  end

  @desc "A summary of statistics for violations w/in a specific column"
  object :violation_statistic do
    field :value,      non_null(:string), description: "the value of this field being aggregated"
    field :violations, :integer, description: "the total number of violations found"
    field :count,      :integer, description: "the total number of policy constraints"
  end

  @desc "A violation of a given OPA Gatekeeper constraint"
  object :violation do
    field :id,        non_null(:id)
    field :group,     :string
    field :version,   :string
    field :kind,      :string
    field :namespace, :string
    field :name,      :string
    field :message,   :string

    timestamps()
  end

  connection node_type: :policy_constraint

  object :policy_queries do
    connection field :policy_constraints, node_type: :policy_constraint do
      middleware Authenticated
      arg :kind,      :string
      arg :namespace, :string
      arg :q,         :string

      resolve &Deployments.list_policy_constraints/2
    end

    field :violation_statistics, list_of(:violation_statistic) do
      middleware Authenticated
      arg :field, non_null(:constraint_violation_field)

      resolve &Deployments.violation_statistics/2
    end

    field :policy_constraint, :policy_constraint do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Deployments.resolve_policy_constraint/2
    end
  end

  object :public_policy_mutations do
    field :upsert_policy_constraints, :integer do
      middleware ClusterAuthenticated
      arg :constraints, list_of(:policy_constraint_attributes)

      resolve &Deployments.upsert_policy_constraints/2
    end
  end
end
