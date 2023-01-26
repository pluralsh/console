defmodule Console.Commands.Plural do
  import Console
  import Console.Commands.Command, only: [cmd: 3]

  def unlock() do
    with {:ok, _} <- plural("crypto", ["init"]),
      do: plural("crypto", ["unlock"])
  end

  def build(), do: plural("build", [])

  def build(repo), do: plural("build", ["--only", repo])

  def deploy(_repo \\ :ignore), do: plural("deploy", ["--silence"])

  def install([_ | _] = repos), do: plural("deploy", ["--silence", "--ignore-console" | Enum.flat_map(repos, & ["--from", &1])])
  def install(repo), do: plural("deploy", ["--silence", "--ignore-console", "--from", repo])

  def unlock_repo(repo), do: plural("repos", ["unlock", repo])

  def diff(_repo \\ :ignore), do: plural("diff", [])

  def bounce(repo), do: plural("bounce", [repo])

  def destroy(repo), do: plural("destroy", ["--force", repo])

  def terminate(node), do: plural("ops", ["terminate", node])

  def repair(), do: plural("repair", [])

  def plural(command, args), do: cmd("plural", [command | args], workspace())
end
