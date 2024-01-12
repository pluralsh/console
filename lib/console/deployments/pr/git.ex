defmodule Console.Deployments.Pr.Git do
  alias Console.Schema.ScmConnection

  @type git_resp :: {:ok, binary} | Console.error

  @spec setup(ScmConnection.t, binary, binary) :: {:ok, ScmConnection.t} | Console.error
  def setup(%ScmConnection{} = conn, id, branch) do
    with {:ok, dir} <- Briefly.create(directory: true),
         conn = %{conn | dir: dir},
         {:ok, _} <- git(conn, "clone", [url(conn, id), dir]),
         {:ok, _} <- git(conn, "checkout", ["-b", branch]),
      do: {:ok, conn}
  end

  @spec commit(ScmConnection.t, binary) :: git_resp
  def commit(%ScmConnection{} = conn, msg), do: git(conn, "commit", ["-m", msg])

  @spec push(ScmConnection.t, binary) :: git_resp
  def push(%ScmConnection{} = conn, branch), do: git(conn, "push", ["--set-upstream", "origin", branch])

  defp git(%ScmConnection{} = conn, cmd, args) when is_list(args) do
    case System.cmd("git", [cmd | args], opts(conn)) do
      {out, 0} -> {:ok, out}
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
  defp url(%ScmConnection{type: :github}), do: "https://github.com/"
  defp url(%ScmConnection{type: :gitlab}), do: "https://gitlab.com/"

  defp opts(%ScmConnection{dir: dir} = conn), do: [env: env(conn), cd: dir, stderr_to_stdout: true]

  defp env(%ScmConnection{token: password}) when is_binary(password),
    do: [{"GIT_ACCESS_TOKEN", password}, {"GIT_ASKPASS", git_askpass()}]
  defp env(_), do: []

  defp git_askpass(), do: Console.conf(:git_askpass)
end
