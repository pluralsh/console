defmodule Console.Local.PodCpu do
  use Console.Local.Base

  schema "pod_cpu" do
    field :cluster,   :string
    field :timestamp, :integer
    field :pod,       :string
    field :namespace, :string
    field :container, :string
    field :cpu,       :float

    timestamps()
  end
end
