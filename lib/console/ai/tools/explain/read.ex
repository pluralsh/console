defmodule Console.AI.Tools.Explain.Read do
  use Console.AI.Tools.Agent.Base
  import Console.AI.Tools.Utils
  alias Console.Schema.{Service, User}
  alias Console.Deployments.Services

  embedded_schema do
    field :file, :string
  end

  @valid ~w(file)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
  end

  @json_schema Console.priv_file!("tools/explain/read.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: plrl_tool("read_file")
  def description(), do: "Reads a given file in the service, you likely want to call the list file tool to find the file to read"

  def implement(%__MODULE__{file: file}) do
    with {:svc, %Service{id: svc_id}} <- {:svc, Tool.parent()},
         %User{} = user <- Tool.actor(),
         {:ok, files} <- Services.service_files(svc_id, user),
         {:file, %{} = result} <- {:file, Enum.find(files, fn %{path: path} -> path == file end)} do
      Jason.encode(%{file: result})
    else
      {:svc, _} -> {:error, "no service found"}
      {:file, _} -> {:error, "file not found"}
      err -> {:error, "internal error fetching files: #{inspect(err)}"}
    end
  end
end
