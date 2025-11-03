defmodule Console.AI.Tools.Agent.ReadGraph do
  use Console.AI.Tools.Agent.Base
  alias Console.AI.Research.Graph

  embedded_schema do
  end

  def changeset(model, attrs) do
    model
    |> cast(attrs, [])
  end

  @json_schema Console.priv_file!("tools/agent/read_graph.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: plrl_tool("read_graph")
  def description(), do: "Fetches the current state of the knowledge graph of the investigation to this point.  Use this if you need to remember any details of work done"

  def implement(_), do: {:ok, Graph.encode!()}
end
