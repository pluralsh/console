defmodule Console.Local.PodOwnership do
  use Console.Local.Base
  alias Console.Schema.ClusterScalingRecommendation

  schema "pod_ownerships" do
    field :cluster,   :string
    field :pod,       :string
    field :namespace, :string
    field :type,      ClusterScalingRecommendation.Type
    field :owner,     :string

    timestamps()
  end
end
