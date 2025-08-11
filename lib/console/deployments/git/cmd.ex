defmodule Console.Deployments.Git.Cmd do
  import Console.Deployments.Pr.Git, only: [request_options: 1]
  alias Console.Schema.{GitRepository, ScmConnection}
  alias Console.Jwt.Github

  def save_private_key(%GitRepository{private_key: pk} = git) when is_binary(pk) do
    with {:ok, path} <- private_key_file(git),
         :ok <- File.write(path, pk),
         :ok <- File.chmod(path, 0o400) do
      {:ok, %{git | private_key_file: path}}
    else
      {:exists, _} -> maybe_overwrite_key(git)
      err -> err
    end
  end

  def save_private_key(%GitRepository{connection: %ScmConnection{token: t}} = git) when is_binary(t),
    do: {:ok, %{git | password: t}}

  def save_private_key(%GitRepository{
    connection: %ScmConnection{
      base_url: url,
      api_url: api_url,
      github: %{app_id: app_id, installation_id: inst_id, private_key: pk}
    } = conn
  } = git) do
    with {:ok, token} <- Github.app_token(api_url || url, app_id, inst_id, pk, request_options(conn)),
      do: {:ok, %{git | password: token}}
  end

  def save_private_key(git), do: {:ok, git}

  def refresh_key(git), do: save_private_key(git)

  defp private_key_file(%GitRepository{private_key_file: f}) when is_binary(f), do: {:exists, f}
  defp private_key_file(_), do: Briefly.create()

  defp maybe_overwrite_key(%GitRepository{private_key_file: f, prev_private_key: f} = git), do: {:ok, git}
  defp maybe_overwrite_key(%GitRepository{private_key_file: f, prev_private_key: nil} = git), do: {:ok, %{git | prev_private_key: f}}
  defp maybe_overwrite_key(%GitRepository{private_key_file: k} = git) when is_binary(k) do
    with {:ok, f} <- Briefly.create(),
         :ok <- File.write(f, k),
         :ok <- File.chmod(f, 0o400),
      do: {:ok, %{git | prev_private_key: k, private_key_file: f}}
  end
  defp maybe_overwrite_key(git), do: {:ok, git}

  def fetch(%GitRepository{} = repo) do
    with {:ok, _} <- git(repo, "fetch", ["--all", "--tags", "--force", "--prune", "--prune-tags"]),
      do: reset(repo)
  end

  def reset(repo) do
    case git(repo, "reset", ["--hard"]) do
      {:ok, _} = res -> res
      _ -> {:ok, :ignore}
    end
  end

  def possibly_pull(repo) do
    with {:ok, _} <- git(repo, "reset", ["--hard"]),
         {:ok, _} <- git(repo, "symbolic-ref", ["--short", "HEAD"]) do
      git(repo, "pull", ["--all"])
    else
      _ -> {:ok, :ignore}
    end
  end

  def sha(%GitRepository{} = repo) do
    with {:ok, sha} <- git(repo, "rev-parse", ["HEAD"]),
      do: {:ok, String.trim(sha)}
  end

  def file_changes(repo, sha1, sha2, folder) do
    case git(repo, "--no-pager", ["diff", "--name-only", "#{sha1}", "#{sha2}", "--", folder]) do
      {:ok, res} -> {:ok, String.trim(res) |> Console.lines()}
      _ -> {:ok, :pass}
    end
  end

  def branches(%GitRepository{} = repo) do
    with {:ok, res} <- git(repo, "branch", ["-r"]) do
      split_and_trim(res)
      |> Enum.filter(fn
        "origin/HEAD" <> _ -> false
        "origin/" <> _ -> true
        _ -> false
      end)
      |> Enum.each(fn "origin/" <> branch = origin ->
        git(repo, "branch", ["-f", "--track", branch, origin])
      end)
    end
  end

  defp split_and_trim(result) do
    String.split(result, ~r/\R/)
    |> Enum.map(&String.trim/1)
  end

  def heads(%GitRepository{} = repo) do
    with {:ok, res} <- git(repo, "show-ref", []) do
      String.split(res, ~r/\R/)
      |> Enum.map(&String.split(&1, " "))
      |> Enum.filter(fn
        [_, _] -> true
        _ -> false
      end)
      |> Enum.flat_map(&coerce_head/1)
      |> Map.new(fn [sha, head] -> {head, sha} end)
    else
      _ -> %{}
    end
  end

  defp coerce_head([sha, head] = res) do
    case String.trim(head) do
      "refs/remotes/origin/" <> branch -> [res, [sha, "refs/heads/#{branch}"]]
      _ -> [res]
    end
  end
  defp coerce_head(_), do: []

  def msg(%GitRepository{} = repo), do: git(repo, "--no-pager", ["log", "-n", "1", "--format=%B"])
  def msg(%GitRepository{} = repo, sha), do: git(repo, "--no-pager", ["log", "-n", "1", "--format=%B", "#{sha}"])

  def clone(%GitRepository{dir: dir} = git) when is_binary(dir) do
    with {:ok, _} = res <- git(git, "clone", ["--filter=blob:none", url(git), git.dir]),
         :ok <- branches(git),
         :ok <- unlock(git),
      do: res
  end

  def git(%GitRepository{} = git, cmd, args \\ []) do
    case System.cmd("git", [cmd | args], opts(git)) do
      {out, 0} -> {:ok, out}
      {out, _} -> {:error, out}
    end
  end

  def plural(%GitRepository{} = git, cmd, args \\ []) do
    case System.cmd("plural", [cmd | args], opts(git)) do
      {out, 0} -> {:ok, out}
      {out, _} -> {:error, out}
    end
  end

  def url(%GitRepository{auth_method: :basic, username: nil, password: pwd} = git) when is_binary(pwd),
    do: url(%{git | username: "apikey"})
  def url(%GitRepository{auth_method: :basic, username: username, url: url}) when is_binary(username) do
    uri = URI.parse(url)
    URI.to_string(%{uri | userinfo: username})
  end
  def url(%GitRepository{url: url}), do: url

  defp unlock(%GitRepository{decrypt: true} = git) do
    with {:ok, _} <- plural(git, "crypto", ["init"]),
         {:ok, _} <- plural(git, "crypto", ["unlock"]),
      do: :ok
  end
  defp unlock(_), do: :ok

  defp opts(%GitRepository{dir: dir} = repo), do: [env: env(repo), cd: dir, stderr_to_stdout: true]

  defp env(%GitRepository{connection: %ScmConnection{proxy: %ScmConnection.Proxy{url: url}}} = repo)
    when is_binary(url), do: [{"HTTP_PROXY", url}, {"HTTPS_PROXY", url} | env(%{repo | connection: nil})]
  defp env(%GitRepository{auth_method: :basic, password: password}) when is_binary(password),
    do: [{"GIT_ACCESS_TOKEN", password}, {"GIT_ASKPASS", git_askpass()}]
  defp env(%GitRepository{auth_method: :ssh, private_key_file: pk_file} = git) when is_binary(pk_file),
    do: [{"GIT_SSH_COMMAND", ssh_command(pk_file)}] ++ passphrase(git)
  defp env(_), do: []

  defp passphrase(%GitRepository{passphrase: pass}) when is_binary(pass),
    do: [{"SSH_PASSPHRASE", pass}, {"SSH_ASKPASS", ssh_askpass()}, {"DISPLAY", "1"}, {"SSH_ASKPASS_REQUIRE", "force"}]
  defp passphrase(_), do: []

  defp git_askpass(), do: Console.conf(:git_askpass)
  defp ssh_askpass(), do: Console.conf(:ssh_askpass)

  defp ssh_command(pk_file), do: "ssh -i #{pk_file} -F /dev/null -o IdentitiesOnly=yes -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no"
end
