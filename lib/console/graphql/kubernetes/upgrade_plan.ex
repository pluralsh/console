defmodule Console.GraphQl.Kubernetes.UpgradePlan do
  use Console.GraphQl.Schema.Base
  import Console.GraphQl.Kubernetes.Base
  alias Console.GraphQl.Resolvers.Kubernetes

  object :upgrade_plan do
    field :metadata, non_null(:metadata)
    field :status,   non_null(:upgrade_plan_status)
    field :spec,     non_null(:upgrade_plan_spec)

    field :pods, list_of(:pod), resolve: fn %{metadata: metadata}, _, _ ->
      Kubernetes.list_pods(metadata, %{"upgrade.cattle.io/controller" => "system-upgrade-controller"})
    end

    field :raw,    non_null(:string), resolve: fn model, _, _ -> encode(model) end
    field :events, list_of(:event), resolve: fn model, _, _ -> Kubernetes.list_events(model) end
  end

  object :upgrade_plan_status do
    field :conditions, list_of(:status_condition)
  end

  object :upgrade_plan_spec do
    field :version,     :string
    field :cordon,      :boolean
    field :concurrency, :integer
  end
end
