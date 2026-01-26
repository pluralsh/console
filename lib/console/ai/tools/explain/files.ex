defmodule Console.AI.Tools.Explain.Files do
  use Console.AI.Tools.Agent.Base
  alias Console.Schema.{Service, User}
  alias Console.Deployments.Services

  embedded_schema do
  end

  def changeset(model, attrs), do: cast(model, attrs, [])

  @json_schema Console.priv_file!("tools/explain/files.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: plrl_tool("list_files")
  def description(), do: "Lists all files in the service, this can be a helm chart, kustomization or just a folder of yaml"

  def implement(%__MODULE__{}) do
    with {:svc, %Service{id: svc_id}} <- {:svc, Tool.parent()},
         %User{} = user <- Tool.actor(),
         {:ok, files} <- Services.service_files(svc_id, user) do
      Jason.encode(%{files: Enum.map(files, fn %{path: path} -> path end)})
    else
      {:svc, _} -> {:error, "no service found"}
      err -> {:error, "internal error fetching files: #{inspect(err)}"}
    end
  end
end
