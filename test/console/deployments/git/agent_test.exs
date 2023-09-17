defmodule Console.Deployments.Git.AgentTest do
  use Console.DataCase, async: false
  alias Console.Deployments.Git.{Agent, Discovery}

  describe "#fetch/2" do
    test "it can checkout and tarball a subfolder of a repo" do
      git = insert(:git_repository, url: "https://github.com/pluralsh/console.git")
      svc = insert(:service, repository: git, git: %{ref: "master", folder: "bin"})

      {:ok, pid} = Discovery.start(git)

      fetch_and_check(pid, svc)

      send pid, :pull

      fetch_and_check(pid, svc)

      git = refetch(git)
      assert git.health == :pullable
      assert git.pulled_at

      assert refetch(svc).sha
    end
  end

  defp fetch_and_check(pid, svc) do
    {:ok, fstream} = Agent.fetch(pid, svc)
    {:ok, tmp} = Briefly.create()
    Enum.into(fstream, File.stream!(tmp))

    {:ok, res} = :erl_tar.extract(tmp, [:compressed, :memory])
    files = Enum.into(res, %{}, fn {name, content} -> {to_string(name), to_string(content)} end)
    for f <- ~w(.git-askpass .ssh-askpass ssh-add),
      do: assert files[f] == File.read!(Path.join("bin", f))
  end
end
