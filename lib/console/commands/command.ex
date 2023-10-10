defmodule Console.Commands.Command do
  import Console
  alias Console.Services.Builds
  alias Console.Commands.Tee
  alias Console.Schema.{Build, Command}

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

  defp make_command(exec, args) do
    case Process.get(@build_key) do
      %Build{} = build ->
        Builds.create_command(%{command: "#{exec} #{Enum.join(args, " ")}"}, build)
      %Tee{} = tee -> {:ok, tee}
      _ -> {:ok, IO.stream(:stdio, :line)}
    end
  end

  defp complete(%Command{} = command, exit_code) do
    with {:ok, command} <- Builds.complete(command, exit_code),
         :ok <- Builds.clear_cache(command) do
      case exit_code do
        0 -> {:ok, command}
        _ -> {:error, command}
      end
    end
  end
  defp complete(result, 0), do: {:ok, result}
  defp complete(result, _), do: {:error, result}
end
