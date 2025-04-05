defmodule Console.AI.Tools.Utils do
  alias Kazan.Models.Apimachinery.Meta.V1, as: MetaV1
  alias Console.Schema.{Service}
  alias Console.Repo

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
