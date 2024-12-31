defmodule Console.Commands.Command do
  import Console
  alias Console.Commands.Tee

  @build_key :console_build

  def set_build(build), do: Process.put(@build_key, build)

  def cmd(exec, args, dir \\ conf(:workspace_root), env \\ []) do
    with {:ok, collectible} <- make_command(exec, args),
         {output, exit_code} <- System.cmd(exec, args, into: collectible, env: [{"ENABLE_COLOR", "1"} | env], cd: dir, stderr_to_stdout: true),
      do: complete(output, exit_code)
  end

  def cmd_raw(exec, args, dir \\ conf(:workspace_root), env \\ []) do
    {output, exit_code} = System.cmd(exec, args, env: [{"ENABLE_COLOR", "1"} | env], cd: dir, stderr_to_stdout: true)
    complete(output, exit_code)
  end

  def cmd_tee(exec, args, dir \\ conf(:workspace_root), env \\ []) do
    tee = Tee.new()
    set_build(tee)
    cmd(exec, args, dir, env)
  end

  defp make_command(_exec, _args) do
    case Process.get(@build_key) do
      %Tee{} = tee -> {:ok, tee}
      _ -> {:ok, IO.stream(:stdio, :line)}
    end
  end

  defp complete(result, 0), do: {:ok, result}
  defp complete(result, _), do: {:error, result}
end
