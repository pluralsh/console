defmodule Console.AI.Tools.Workbench.Infrastructure.Manifests do
  use Console.AI.Tools.Agent.Base
  import Piazza.Ecto.Schema, only: [validate_one_present: 2]
  alias Console.Deployments.{Services, Stacks}
  alias Console.AI.{File.Grepper, Workbench.FileCache}

  embedded_schema do
    field :user,   :map, virtual: true
    field :cache,  :map, virtual: true

    field :service_id, :string
    field :stack_id,   :string

    field :glob, :string
    field :grep, :string
    field :read, :string
  end

  @json_schema Console.priv_file!("tools/workbench/infrastructure/manifests.json") |> Jason.decode!()

  def json_schema(_), do: @json_schema
  def name(_), do: "gitops_manifests"
  def description(_) do
    "Finds the GitOps configuration files for a service or stack, with the ability to list files matching a glob pattern, grep, or read individual files (can perform multiple in one pass)"
  end

  @valid ~w(service_id stack_id glob grep read)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> check_uuid(:service_id)
    |> check_uuid(:stack_id)
    |> validate_one_present([:service_id, :stack_id])
  end

  def implement(%__MODULE__{user: user, cache: cache} = model) do
    with {:ok, parent} <- parent(model),
         {:ok, files} <- FileCache.fetch(cache, parent, user) do
      process(model, files)
    end
  end

  defp parent(%__MODULE__{service_id: id}) when is_binary(id), do: {:ok, Services.get_service(id)}
  defp parent(%__MODULE__{stack_id: id}) when is_binary(id), do: {:ok, Stacks.get_stack(id)}
  defp parent(_), do: {:error, "no service or stack id provided"}

  defp process(model, files) do
    Enum.reduce_while(~w(glob grep read)a, %{}, fn field, acc ->
      with v when is_binary(v) <- Map.get(model, field),
           {:ok, result} <- do_process(field, v, files) do
        {:cont, Map.put(acc, field, result)}
      else
        {:error, _} = err -> {:halt, err}
        _ -> {:cont, acc}
      end
    end)
    |> case do
      %{} = map -> Jason.encode(map)
      err -> err
    end
  end

  defp do_process(:glob, glob, files) do
    Enum.filter(files, fn %{path: path} -> PathGlob.match?(path, glob) end)
    |> Enum.map(& &1.path)
    |> then(& {:ok, &1})
  rescue
    e -> {:error, "argument error in glob: #{Exception.message(e)}"}
  end

  defp do_process(:grep, regex, files) do
    Enum.reduce_while(files, [], fn %{path: name, content: content}, acc ->
      case Grepper.grep(content, regex) do
        {:ok, [_ | _] = results} -> {:cont, [%{file: name, results: results} | acc]}
        {:error, _} = err -> {:halt, err}
        _ -> {:cont, acc}
      end
    end)
    |> case do
      l when is_list(l) -> {:ok, l}
      err -> {:error, "failed to grep files: #{inspect(err)}"}
    end
  end

  defp do_process(:read, file, files) do
    case Enum.find(files, fn %{path: path} -> path == file end) do
      %{} = file -> {:ok, file}
      _ -> {:error, "file not found"}
    end
  end
end
