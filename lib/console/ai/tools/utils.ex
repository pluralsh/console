defmodule Console.AI.Tools.Utils do
  @spec tool_content(atom, map) :: binary
  def tool_content(tool, map) do
    Path.join([:code.priv_dir(:console), "tools", "templates", "#{tool}.md.eex"])
    |> EEx.eval_file(assigns: Map.to_list(map))
  end
end
