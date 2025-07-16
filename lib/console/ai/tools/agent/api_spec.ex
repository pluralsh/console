defmodule Console.AI.Tools.Agent.ApiSpec do
  use Console.AI.Tools.Agent.Base
  alias Console.Schema.{Cluster}
  alias Console.Deployments.Clusters

  embedded_schema do
    field :group, :string
    field :version, :string
  end

  @json_schema Console.priv_file!("tools/agent/api_spec.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: plrl_tool("api_spec")
  def description(), do: "Prints the openapi spec for a given kubernetes group and version, core versions not supported but are also fully well-known.  To find the exact group and version, use the api_discovery tool, this is especially useful when a user is looking to write a complex kubernetes manifest."

  @valid ~w(group version)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
  end

  def implement(%__MODULE__{group: nil}), do: {:ok, "Core (null) groups are not supported, use the standard definition for its kubernetes kinds"}
  def implement(%__MODULE__{group: group, version: version}) do
    with {:session, %AgentSession{cluster: %Cluster{} = cluster}} <- session(),
         {:ok, spec} <- Clusters.api_spec(cluster, group, version) do
      Jason.encode(spec)
    else
      {:session, _} -> {:error, "No cluster bound to this session"}
      err -> err
    end
  end
end
