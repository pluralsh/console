defmodule Console.Deployments.Git.Cmd do
  alias Console.Schema.GitRepository

  def save_private_key(%GitRepository{private_key: pk} = git) when is_binary(pk) do
    with {:ok, path} <- Briefly.create(),
         :ok <- File.write(path, pk),
         :ok <- File.chmod(path, 0o400),
      do: {:ok, %{git | private_key_file: path}}
  end
  def save_private_key(git), do: {:ok, git}

  def fetch(%GitRepository{} = repo) do
    with {:ok, _} <- git(repo, "fetch", ["--all", "--force", "--prune"]),
         :ok <- branches(repo),
      do: possibly_pull(repo)
  end

  def possibly_pull(repo) do
    case git(repo, "symbolic-ref", ["--short", "HEAD"]) do
      {:ok, _} -> git(repo, "pull", ["--all", "--rebase"])
      _ -> {:ok, :ignore}
    end
  end

  def sha(%GitRepository{} = repo) do
    with {:ok, sha} <- git(repo, "rev-parse", ["HEAD"]),
      do: {:ok, String.trim(sha)}
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
    with {:ok, res} <- git(repo, "show-ref", ["--heads", "--tags"]) do
      String.split(res, ~r/\R/)
      |> Enum.map(&String.split(&1, " "))
      |> Enum.filter(fn
        [_, _] -> true
        _ -> false
      end)
      |> Map.new(fn [sha, head] -> {head, sha} end)
    else
      _ -> %{}
    end
  end

  def msg(%GitRepository{} = repo), do: git(repo, "--no-pager", ["log", "-n", "1", "--format=%B"])

  def clone(%GitRepository{dir: dir} = git) when is_binary(dir) do
    with {:ok, _} = res <- git(git, "clone", ["--filter=blob:none", url(git), git.dir]),
         :ok <- branches(git),
      do: res
  end

  def git(%GitRepository{} = git, cmd, args \\ []) do
    case System.cmd("git", [cmd | args], opts(git)) do
      {out, 0} -> {:ok, out}
      {out, _} -> {:error, out}
    end
  end

  def url(%GitRepository{auth_method: :http, username: nil, password: pwd} = git) when is_binary(pwd),
    do: url(%{git | username: "apikey"})
  def url(%GitRepository{auth_method: :http, username: username, url: url}) when is_binary(username) do
    uri = URI.parse(url)
    URI.to_string(%{uri | userinfo: username})
  end
  def url(%GitRepository{url: url}), do: url

  defp opts(%GitRepository{dir: dir} = repo), do: [env: env(repo), cd: dir, stderr_to_stdout: true]

  defp env(%GitRepository{auth_method: :http, password: password}) when is_binary(password),
    do: [{"GIT_ACCESS_TOKEN", password}, {"GIT_ASKPASS", "/root/bin/.git-askpass"}]
  defp env(%GitRepository{auth_method: :ssh, private_key_file: pk_file} = git) when is_binary(pk_file),
    do: [{"GIT_SSH_COMMAND", ssh_command(pk_file)}] ++ passphrase(git)
  defp env(_), do: []

  defp passphrase(%GitRepository{passphrase: pass}) when is_binary(pass),
    do: [{"SSH_PASSPHRASE", pass}, {"SSH_ASKPASS", "/root/bin/.ssh-askpass"}, {"DISPLAY", "1"}, {"SSH_ASKPASS_REQUIRE", "force"}]
  defp passphrase(_), do: []

  defp ssh_command(pk_file), do: "ssh -i #{pk_file} -F /dev/null -o IdentitiesOnly=yes -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no"
end
