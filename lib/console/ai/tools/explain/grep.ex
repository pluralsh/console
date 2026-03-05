defmodule Console.AI.Tools.Explain.Grep do
  use Console.AI.Tools.Agent.Base
  alias Console.Schema.{Service, User}
  alias Console.Deployments.Services

  embedded_schema do
    field :regex, :string
  end

  @valid ~w(regex)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required(@valid)
  end

  @json_schema Console.priv_file!("tools/explain/grep.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: plrl_tool("grep_files")
  def description(), do: "Grep the files in the service for a given regex"

  def implement(%__MODULE__{regex: regex}) do
    with {:svc, %Service{id: svc_id}} <- {:svc, Tool.parent()},
         %User{} = user <- Tool.actor(),
         {:ok, files} <- Services.service_files(svc_id, user) do
      Enum.reduce_while(files, [], fn %{name: name, content: content}, acc ->
        case Console.AI.File.Grepper.grep(content, regex) do
          {:ok, [_ | _] = results} -> {:cont, [%{file: name, results: results} | acc]}
          {:error, _} = err -> {:halt, err}
          _ -> {:cont, acc}
        end
      end)
      |> when_ok(&Jason.encode/1)
    else
      {:svc, _} -> {:error, "no service found"}
      err -> {:error, "internal error fetching files: #{inspect(err)}"}
    end
  end
end
