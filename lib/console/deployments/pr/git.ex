defmodule Console.Deployments.Pr.Git do
  alias Console.Jwt.Github
  alias Console.Schema.{ScmConnection, User}

  @type git_resp :: {:ok, binary} | Console.error

  @spec setup(ScmConnection.t, binary, binary) :: {:ok, ScmConnection.t} | Console.error
  def setup(%ScmConnection{} = conn, identifier, branch) do
    with {:ok, dir} <- Briefly.create(directory: true),
         conn = %{conn | dir: dir},
         {:ok, conn} <- backfill_token(conn),
         {:ok, _} <- git(conn, "clone", branch_args(conn) ++ [url(conn, identifier), dir]),
         {:ok, b} <- branch(conn),
         {:ok, _} <- git(conn, "config", ["user.email", conn.author.email]),
         {:ok, _} <- git(conn, "config", ["user.name", conn.author.name]),
         :ok <- configure_signing(conn),
         {:ok, _} <- git(conn, "checkout", ["-b", branch]),
      do: {:ok, %{conn | branch: b}}
  end

  def clone_branch(%ScmConnection{} = conn, identifier, branch) do
    with {:ok, dir} <- Briefly.create(directory: true),
         conn = %{conn | dir: dir, branch: branch},
         {:ok, conn} <- backfill_token(conn),
         {:ok, _} <- git(conn, "clone", branch_args(conn) ++ [url(conn, identifier), dir]),
         {:ok, _} <- git(conn, "config", ["user.email", conn.author.email]),
         {:ok, _} <- git(conn, "config", ["user.name", conn.author.name]),
         :ok <- configure_signing(conn),
      do: {:ok, conn}
  end

  @spec commit(ScmConnection.t, binary) :: git_resp
  def commit(%ScmConnection{} = conn, msg) do
    with {:ok, _} <- git(conn, "add", ["."]),
      do: git(conn, "commit", ["-m", msg])
  end

  @spec patch(ScmConnection.t, binary) :: git_resp
  def patch(%ScmConnection{} = conn, f), do: git(conn, "apply", [f])

  @spec branch(ScmConnection.t) :: {:ok, binary} | Console.error
  def branch(conn), do: git(conn, "rev-parse", ["--abbrev-ref", "HEAD"])

  @spec push(ScmConnection.t, binary) :: git_resp
  def push(%ScmConnection{} = conn, branch),
    do: git(conn, "push", ["--set-upstream", "origin", branch])

  @spec push(ScmConnection.t) :: git_resp
  def push(%ScmConnection{} = conn),
    do: git(conn, "push", [])

  def git(%ScmConnection{} = conn, cmd, args) when is_list(args) do
    case System.cmd("git", [cmd | args], opts(conn)) do
      {out, 0} -> {:ok, String.trim(out)}
      {out, _} -> {:error, out}
    end
  end

  def commit_patch(%ScmConnection{} = conn), do: git(conn, "--no-pager", ["format-patch", "-1", "HEAD", "--stdout"])

  def slug(%ScmConnection{} = conn, url) do
    case Regex.scan(~r[^#{url(conn)}/(.*)\.git$], url) do
      [[_, slug] | _] -> {:ok, slug}
      _ -> {:error, "could not determine repo slug from #{url}"}
    end
  end

  def to_http(conn, url), do: "#{String.trim_trailing(_to_http(conn, url), ".git")}.git"

  def backfill_token(%ScmConnection{api_url: api_url, base_url: url, github: %{app_id: app_id, installation_id: inst_id, private_key: pk}} = conn) when is_binary(pk) do
    with {:ok, token} <- Github.app_token(api_url || url, app_id, inst_id, pk, request_options(conn)),
      do: {:ok, %{conn | token: token}}
  end
  def backfill_token(%ScmConnection{} = conn), do: {:ok, conn}

  def request_options(%ScmConnection{proxy: %ScmConnection.Proxy{url: url}}) when is_binary(url),
    do: [proxy: url]
  def request_options(_), do: []

  defp _to_http(conn, "ssh://" <> rest), do: _to_http(conn, rest)
  defp _to_http(%ScmConnection{} = conn, "git@" <> _ = url) do
    case String.split(url, ":") do
      [_ | rest] -> Path.join(url(conn), Enum.join(rest, ""))
      _ -> url
    end
  end
  defp _to_http(_, "https://" <> _ = url), do: url

  defp url(%ScmConnection{azure: %ScmConnection.Azure{organization: organization}, username: uname} = conn, id)
    when uname != organization, do: url(%{conn | username: organization}, id)
  defp url(%ScmConnection{username: nil} = conn, id), do: url(%{conn | username: "apikey"}, id)
  defp url(%ScmConnection{username: username}, "https://" <> _ = url) do
    uri = URI.parse(url)
    URI.to_string(%{uri | userinfo: username})
  end
  defp url(%ScmConnection{username: username} = conn, id) do
    URI.parse("#{url(conn)}/#{id}#{if conn.type == :azure_devops, do: "", else: ".git"}")
    |> Map.put(:userinfo, username)
    |> URI.to_string()
  end

  defp url(%ScmConnection{base_url: base}) when is_binary(base), do: base
  defp url(%ScmConnection{type: :github}), do: "https://github.com"
  defp url(%ScmConnection{type: :gitlab}), do: "https://gitlab.com"
  defp url(%ScmConnection{type: :bitbucket}), do: "https://bitbucket.org"
  defp url(%ScmConnection{type: :azure_devops, azure: %ScmConnection.Azure{organization: org, project: project}}),
    do: "https://dev.azure.com/#{org}/#{project}/_git"

  defp opts(%ScmConnection{dir: dir} = conn), do: [env: env(conn), cd: dir, stderr_to_stdout: true]

  defp env(%ScmConnection{proxy: %ScmConnection.Proxy{url: url}} = conn) when is_binary(url),
    do: [{"HTTP_PROXY", url}, {"HTTPS_PROXY", url} | env(%{conn | proxy: nil})]
  defp env(%ScmConnection{token: password}) when is_binary(password),
    do: [{"GIT_ACCESS_TOKEN", password}, {"GIT_ASKPASS", git_askpass()}]
  defp env(_), do: []

  defp branch_args(%ScmConnection{branch: b}) when is_binary(b), do: ["-b", b]
  defp branch_args(_), do: []

  defp configure_signing(%ScmConnection{author: %User{signing_private_key: pk}} = conn) when is_binary(pk),
    do: configure_signing(%{conn | signing_private_key: pk, author: nil})
  defp configure_signing(%ScmConnection{signing_private_key: pk} = conn) when is_binary(pk) do
    with {:ok, f} <- Briefly.create(),
         :ok <- File.write(f, pk),
         :ok <- File.chmod(f, 0o400),
         {:ok, _} <- git(conn, "config", ["user.signingKey", f]),
         {:ok, _} <- git(conn, "config", ["commit.gpgsign", "true"]),
         {:ok, _} <- git(conn, "config", ["gpg.format", "ssh"]),
      do: :ok
  end
  defp configure_signing(_), do: :ok

  defp git_askpass(), do: Console.conf(:git_askpass)
end
