defmodule Console.Local.PodMemoryRequest do
  use Console.Local.Base

  schema "pod_memory_requests" do
    field :cluster,   :string
    field :timestamp, :integer
    field :pod,       :string
    field :namespace, :string
    field :container, :string
    field :memory,    :float

    timestamps()
  end
end
