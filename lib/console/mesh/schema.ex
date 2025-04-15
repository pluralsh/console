defmodule Console.Mesh.Workload do
  @type t :: %__MODULE__{}
  defstruct [:id, :name, :namespace, :service]
end

defmodule Console.Mesh.Statistics do
  @type t :: %__MODULE__{}
  defstruct [:bytes_sent, :bytes_received, :packets, :connections]
end

defmodule Console.Mesh.Edge do
  alias Console.Mesh.{Workload, Statistics}
  @type t :: %__MODULE__{
    id: binary,
    from: Workload.t(),
    to: Workload.t(),
    statistics: Statistics.t()
  }

  defstruct [:id, :from, :to, :statistics]
end
