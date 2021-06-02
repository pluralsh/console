defmodule Console.Commands.Configuration do
  use Task, restart: :transient
  require Logger
  import Console

  def start_link(_) do
    Task.start_link(__MODULE__, :run, [])
  end

  def run() do
    {:ok, _} = register_ssh_keys()
  end

  defp register_ssh_keys() do
    with ssh_key when is_binary(ssh_key) <- mkpath(conf(:git_ssh_key)),
      do: cmd("ssh-add", [ssh_key])
  end

  defp cmd(command, args) do
    case System.cmd(command, args, env: [{"DISPLAY", ""}, {"SSH_ASKPASS", "/root/bin/.ssh-askpass"}]) do
      {out, 0} -> {:ok, out}
      {out, _} ->
        Logger.error out
        {:error, out}
    end
  end

  defp mkpath(:pass), do: {:ok, :pass}
  defp mkpath({:home, dir}), do: System.user_home!() |> Path.join(dir)
  defp mkpath(dir) when is_binary(dir), do: dir
  defp mkpath(nil), do: {:ok, :pass}
end
