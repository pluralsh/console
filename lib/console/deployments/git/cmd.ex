defmodule Console.Deployments.Git.Cmd do
  alias Console.Schema.GitRepository

  def save_private_key(%GitRepository{private_key: pk} = git) when is_binary(pk) do
    with {:ok, path} <- Briefly.create(),
         {:ok, _} <- File.write(path, pk),
         :ok <- File.chmod(path, 0o400),
      do: {:ok, %{git | private_key_file: path}}
  end
  def save_private_key(git), do: {:ok, git}

  def fetch(%GitRepository{} = repo) do
    with {:ok, _} <- git(repo, "fetch", ["--all"]),
      do: git(repo, "pull", ["--all"])
  end

  def sha(%GitRepository{} = repo) do
    with {:ok, sha} <- git(repo, "rev-parse", ["HEAD"]),
      do: {:ok, String.trim(sha)}
  end

  def clone(%GitRepository{} = git), do: git(git, "clone", [url(git), git.dir])

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

  defp ssh_command(pk_file), do: "ssh -i #{pk_file} -o IdentitiesOnly=yes -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no -o LogLevel=quiet"
end
