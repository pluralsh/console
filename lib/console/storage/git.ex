defmodule Console.Storage.Git do
  import Console
  import Console.Commands.Command, only: [cmd: 2, cmd: 3]
  alias Console.Commands.Plural

  def init() do
    unless File.exists?(workspace()) do
      with {:ok, _} <- maybe_add_username(conf(:git_url)),
           {:ok, _} <- cmd("git", ["clone", "-b", branch(), conf(:git_url), workspace()]),
           {:ok, _} <- git("config", ["user.name", conf(:git_user_name)]),
           {:ok, _} <- git("config", ["user.email", conf(:git_user_email)]),
        do: Plural.unlock()
    else
      pull()
    end
  end

  def maybe_add_username("https://" <> _rest = git_url) do
    url = URI.parse(git_url)
    url = URI.to_string(%{url | path: ""})
    cmd("git", ["config", "--global", "credential.#{url}.username", conf(:git_user_name)])
  end
  def maybe_add_username(_), do: {:ok, :ignore}

  def push(retry \\ 0) do
    case {git("push"), retry} do
      {{:ok, _} = result, _} -> result
      {_, retries} when retries >= 3 -> {:error, :exhausted_retries}
      {_, retry} ->
        with {:ok, _} <- do_pull(),
          do: push(retry + 1)
    end
  end

  def pull() do
    with {:ok, _} <- reset(),
      do: do_pull()
  end

  def do_pull() do
    with {:error, _} <- git("pull", ["--rebase"]),
         {:ok, _} <- Plural.repair(),
      do: git("pull", ["--rebase"])
  end

  def revise(msg) do
    with {:ok, _} <- git("add", ["."]),
      do: git("commit", ["-m", msg])
  end

  def revision() do
    case System.cmd("git", ["rev-parse", "HEAD"], cd: workspace()) do
      {sha, 0} -> {:ok, sha}
      {result, _} -> {:error, result}
    end
  end

  def reset() do
    with {:ok, _} <- git("reset", ["--hard", "origin/#{branch()}"]),
      do: git("clean", ["-f"])
  end

  def doctor() do
    with {:ok, _} <- check_detached(),
      do: pull()
  end

  defp check_detached() do
    case git("rev-parse", ["--symbolic-full-name",  "HEAD"]) do
      {:ok, "HEAD" <> _} ->
        git("stash")
        git("checkout", [branch()])
      _ -> {:ok, ""}
    end
  end

  def git(cmd, args \\ []),
    do: cmd("git", [cmd | args], workspace())

  defp branch(), do: Console.conf(:branch, "master")
end
