defmodule Console.AI.Tools.Utils do
  alias Kazan.Models.Apimachinery.Meta.V1, as: MetaV1
  alias Console.GraphQl.Helpers
  alias Console.Schema.{Service, Flow}
  alias Console.Repo

  def for_flow(fun) when is_function(fun, 1) do
    case Console.AI.Tool.flow() do
      %Flow{} = flow -> fun.(flow)
      _ -> {:error, "no flow found"}
    end
  end

  def for_parent(fun) when is_function(fun, 1) do
    case Console.AI.Tool.parent() do
      %{} = parent -> fun.(parent)
      _ -> {:error, "no valid parent resource found for this chat"}
    end
  end

  def jsonify!(v) do
    Console.mapify(v)
    |> Jason.encode!()
  end

  def jsonify(v) do
    Console.mapify(v)
    |> Jason.encode()
  end

  def when_ok({:ok, v}, fun) when is_function(fun, 1), do: {:ok, fun.(v)}
  def when_ok(v, _), do: v

  def error({:error, %Ecto.Changeset{} = changeset}) do
    errors = Helpers.resolve_changeset(changeset)
    {:ok, "Encountered errors:\n #{Enum.join(errors, "\n")}"}
  end
  def error({:error, {:http_error, _, %{"message" => msg}}}), do: {:ok, msg}
  def error({:error, {:http_error, _, err}}) when is_binary(err), do: {:ok, err}
  def error({:error, error}) when is_binary(error), do: {:ok, "Encountered error: #{error}"}
  def error({:error, error}), do: {:ok, "internal error: #{inspect(error)}"}
  def error(v), do: v

  def k8s_encode(model) do
    data = k8s_map(model)
    {:ok, doc} = yaml_encode(data)
    doc
  end

  def k8s_map(%{__struct__: struct} = model) do
    {:ok, data} = prune(model)
                  |> struct.encode()
    data
  end

  def indent(str, count \\ 2) do
    String.split(str, "\n")
    |> Enum.map_join("\n", & "#{String.duplicate(" ", count)}#{&1}")
  end

  def yaml_encode(data) do
    with {:ok, doc} = Ymlr.document(data),
      do: {:ok, String.trim_leading(doc, "---\n")}
  end

  def prune(%{metadata: %MetaV1.ObjectMeta{}} = object),
    do: put_in(object.metadata.managed_fields, [])
  def prune(%{"metadata" => %{"managedFields" => _}} = object),
    do: put_in(object["metadata"]["managedFields"], [])
  def prune(obj), do: obj

  def plrl_tool(tool), do: "__plrl__#{tool}"

  def plrl_tool_name("__plrl__" <> name), do: name

  @spec tool_content(atom, map) :: binary
  def tool_content(tool, map) do
    Path.join([:code.priv_dir(:console), "tools", "templates", "#{tool}.md.eex"])
    |> EEx.eval_file(assigns: Map.to_list(map))
  end

  @spec get_service(binary, binary, binary) :: Service.t | nil
  def get_service(flow_id, name, cluster) do
    Service.for_flow(flow_id)
    |> Service.for_cluster_handle(cluster)
    |> Service.search(name)
    |> Repo.one()
    |> Repo.preload([:cluster])
  end
end
