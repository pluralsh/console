defprotocol Console.AI.Tools.Workbench.OutputType do
  @moduledoc """
  Defines the output type for a workbench tool.
  """

  @doc """
  Returns the output type for a workbench tool.
  """
  @spec output_type(term()) :: binary()
  def output_type(value)

  @spec convert(term(), binary()) :: term()
  def convert(schema, value)
end

defimpl Console.AI.Tools.Workbench.OutputType,
  for: [
    Console.AI.Tools.Workbench.Infrastructure.KubeGet,
    Console.AI.Tools.Workbench.Infrastructure.KubeList
  ] do
  def output_type(_), do: "JSON decoded output from the associated k8s api call"

  def convert(_, value), do: Jason.decode!(value)
end

defimpl Console.AI.Tools.Workbench.OutputType,
  for: [
    Console.AI.Tools.Workbench.Infrastructure.RawKubeGet,
    Console.AI.Tools.Workbench.Infrastructure.RawKubeList,
  ] do
  def output_type(_), do: "JSON decoded output from the associated Kubernetes API call"

  def convert(_, value), do: value
end

defimpl Console.AI.Tools.Workbench.OutputType,
  for: [
    Console.AI.Tools.Workbench.Infrastructure.CloudQuery
  ] do
  def output_type(_),
    do: "List of dicts keyed by column name and value column type for the given SQL query"

  def convert(_, value), do: Jason.decode!(value)
end

defimpl Console.AI.Tools.Workbench.OutputType,
  for: [
    Console.AI.Tools.Workbench.Infrastructure.RawCloudQuery
  ] do
  def output_type(_),
    do: "List of dicts keyed by column name and value column type for the given SQL query.  Associate with the sql schema for the table itself to infer what the list element will be, and you can run a query with LIMIT 1 to peek at the return shape as well."

  def convert(_, value), do: value
end
