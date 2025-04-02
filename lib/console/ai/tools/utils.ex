defmodule Console.AI.Tools.Utils do
  alias Console.Schema.{Service}
  alias Console.Repo

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
