defmodule Console.Local.PodMemoryMax do
  use Console.Local.Base

  schema "pod_memory_maxes" do
    field :cluster,   :string
    field :timestamp, :integer
    field :pod,       :string
    field :namespace, :string
    field :container, :string
    field :memory,    :float

    timestamps()
  end
end
