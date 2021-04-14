defmodule Watchman.Commands.Plural do
  import Watchman
  import Watchman.Commands.Command, only: [cmd: 3]

  def unlock() do
    with {:ok, _} <- plural("crypto", ["init"]),
      do: plural("crypto", ["unlock"])
  end

  def build(repo), do: plural("build", ["--only", repo])

  def deploy(repo), do: plural("deploy", [repo])

  def diff(repo), do: plural("diff", [repo])

  def bounce(repo), do: plural("bounce", [repo])

  def plural(command, args), do: cmd("plural", [command | args], workspace())
end
