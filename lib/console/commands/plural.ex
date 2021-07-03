defmodule Console.Commands.Plural do
  import Console
  import Console.Commands.Command, only: [cmd: 3]

  def unlock() do
    with {:ok, _} <- plural("crypto", ["init"]),
      do: plural("crypto", ["unlock"])
  end

  def build(repo), do: plural("build", ["--only", repo])

  def deploy(_repo), do: plural("deploy", [])

  def diff(_repo), do: plural("diff", [])

  def bounce(repo), do: plural("bounce", [repo])

  def plural(command, args), do: cmd("plural", [command | args], workspace())
end
