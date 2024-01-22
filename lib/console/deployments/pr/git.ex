defmodule Console.Deployments.Pr.Git do
  alias Console.Schema.{ScmConnection}

  @type git_resp :: {:ok, binary} | Console.error

  @spec setup(ScmConnection.t, binary, binary) :: {:ok, ScmConnection.t} | Console.error
  def setup(%ScmConnection{} = conn, id, branch) do
    with {:ok, dir} <- Briefly.create(directory: true),
         conn = %{conn | dir: dir},
         {:ok, _} <- git(conn, "clone", branch_args(conn) ++ [url(conn, id), dir]),
         {:ok, b} <- branch(conn),
         {:ok, _} <- git(conn, "config", ["user.email", conn.author.email]),
         {:ok, _} <- git(conn, "config", ["user.name", conn.author.name]),
         {:ok, _} <- git(conn, "checkout", ["-b", branch]),
      do: {:ok, %{conn | branch: b}}
  end

  @spec commit(ScmConnection.t, binary) :: git_resp
  def commit(%ScmConnection{} = conn, msg) do
    with {:ok, _} <- git(conn, "add", ["."]),
      do: git(conn, "commit", ["-m", msg])
  end

  @spec branch(ScmConnection.t) :: {:ok, binary} | Console.error
  def branch(conn), do: git(conn, "rev-parse", ["--abbrev-ref", "HEAD"])

  @spec push(ScmConnection.t, binary) :: git_resp
  def push(%ScmConnection{} = conn, branch), do: git(conn, "push", ["--set-upstream", "origin", branch])

  def git(%ScmConnection{} = conn, cmd, args) when is_list(args) do
    case System.cmd("git", [cmd | args], opts(conn)) do
      {out, 0} -> {:ok, String.trim(out)}
      {out, _} -> {:error, out}
    end
  end

  defp url(%ScmConnection{username: nil} = conn, id), do: url(%{conn | username: "apikey"}, id)
  defp url(%ScmConnection{username: username} = conn, id) do
    base = url(conn)
    uri = URI.parse("#{base}/#{id}.git")
    URI.to_string(%{uri | userinfo: username})
  end

  defp url(%ScmConnection{base_url: base}) when is_binary(base), do: base
  defp url(%ScmConnection{type: :github}), do: "https://github.com"
  defp url(%ScmConnection{type: :gitlab}), do: "https://gitlab.com"

  defp opts(%ScmConnection{dir: dir} = conn), do: [env: env(conn), cd: dir, stderr_to_stdout: true]

  defp env(%ScmConnection{token: password}) when is_binary(password),
    do: [{"GIT_ACCESS_TOKEN", password}, {"GIT_ASKPASS", git_askpass()}]
  defp env(_), do: []

  defp branch_args(%ScmConnection{branch: b}) when is_binary(b), do: ["-b", b]
  defp branch_args(_), do: []

  defp git_askpass(), do: Console.conf(:git_askpass)
end
