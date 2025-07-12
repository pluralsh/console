defmodule Console.AI.Tools.Agent.Search do
  use Console.AI.Tools.Agent.Base
  alias Console.AI.Graph.Provider
  alias Console.Schema.{AgentSession, CloudConnection, User}

  embedded_schema do
    field :query, :string
  end

  @valid ~w(query)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required(@valid)
  end

  @json_schema Console.priv_file!("tools/agent/cloud_search.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: plrl_tool("cloud_search")
  def description(), do: "Execute a semantic search against your cloud data, this will return a list of resources that vector-match the given input query. Use this when a user is searching for a specific cloud resource, rather than aggregate queries across a cloud account. If the user is looking for how its configured as a stack or infrastructure as code, use a stack search instead."

  def implement(%__MODULE__{query: query}) do
    with %User{} = user <- Console.AI.Tool.actor(),
         {:session, %AgentSession{connection: %CloudConnection{id: id}}} <- session(),
         {:ok, results} <- Provider.fetch(query, user, connections: [id], count: 5) do
      Jason.encode(results)
    else
      {:session, _} -> {:ok, "No cloud connection tied to this session, cannot query"}
      {:error, reason} -> {:ok, "Error getting schema: #{inspect(reason)}"}
      _ -> {:error, "not logged in"}
    end
  end
end
