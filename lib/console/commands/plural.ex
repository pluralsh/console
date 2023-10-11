defmodule Console.Commands.Plural do
  require Logger
  import Console
  import Console.Commands.Command, only: [cmd_raw: 3, cmd: 4]

  def unlock() do
    with {:ok, _} <- plural("crypto", ["init"]),
      do: plural("crypto", ["unlock"])
  end

  def build(), do: plural("build", [])

  def build(repo), do: plural("build", ["--only", repo])

  def deploy(_repo \\ :ignore), do: plural("deploy", ["--silence"])

  def install([_ | _] = repos), do: plural("deploy", ["--silence", "--ignore-console" | Enum.flat_map(repos, & ["--from", &1])])
  def install(repo), do: plural("deploy", ["--silence", "--ignore-console", "--from", repo])

  def install_cd(url, token, kubeconfig \\ nil) do
    with conf when is_binary(conf) <- kubeconfig,
         {:ok, f} <- Briefly.create(),
         :ok <- File.write(f, conf) do
      plural("deployments", ["install", "--url", url, "--token", token], [{"KUBCONFIG", f}])
    else
      nil -> plural("deployments", ["install", "--url", url, "--token", token])
      err -> err
    end
  end

  def unlock_repo(repo), do: plural("repos", ["unlock", repo])

  def diff(_repo \\ :ignore) do
    case plural("diff", []) do
      {:ok, _} = ok -> ok
      {:error, error} -> {:ok, error} # swallow diff errors to prevent it from jamming builds
    end
  end

  def bounce(repo), do: plural("bounce", [repo])

  def destroy(repo), do: plural("destroy", ["--force", repo])

  def terminate(node), do: plural("ops", ["terminate", node])

  def info(repo), do: cmd_raw("plural", ["info", repo], workspace())

  def repair(), do: plural("repair", [])

  def plural(command, args, env \\ []), do: cmd("plural", [command | args], workspace(), env)
end
