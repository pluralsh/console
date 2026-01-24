defmodule Console.AI.Tools.Explain.ListComponents do
  use Console.AI.Tools.Agent.Base
  import Console.AI.Tools.Utils
  alias Console.Schema.{Service, ServiceComponent}

  embedded_schema do
  end

  @valid ~w()a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
  end

  @json_schema Console.priv_file!("tools/explain/files.json") |> Jason.decode!() # empty schema for now

  def json_schema(), do: @json_schema
  def name(), do: plrl_tool("list_components")
  def description(), do: "Lists all components in the service for this insight, will include both failing and ready components in case you want to evaluate any of them"

  def implement(%__MODULE__{}) do
    with {:svc, %Service{id: svc_id}} <- {:svc, Tool.parent()} do
      ServiceComponent.for_service(svc_id)
      |> Console.Repo.all()
      |> Enum.map(&Map.take(&1, [:id, :name, :group, :version, :kind, :namespace, :state, :synced]))
      |> Jason.encode()
    else
      {:svc, _} -> {:error, "no service found"}
      err -> {:error, "internal error fetching components: #{inspect(err)}"}
    end
  end
end
