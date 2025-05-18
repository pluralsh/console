defmodule Console.Deployments.Git.AgentTest do
  use Console.DataCase, async: false
  alias Console.SmartFile
  alias Console.Deployments.Git.{Agent, Discovery}

  describe "#fetch/2" do
    test "it can checkout and tarball a subfolder of a repo" do
      git = insert(:git_repository, url: "https://github.com/pluralsh/console.git")
      svc = insert(:service, repository: git, git: %{ref: "master", folder: "bin"})

      {:ok, pid} = Discovery.start(git)

      fetch_and_check(git, svc)

      send pid, :pull

      fetch_and_check(git, svc)

      git = refetch(git)
      assert git.health == :pullable
      assert git.pulled_at

      assert refetch(svc).sha

      assert Process.alive?(pid)

      Process.exit(pid, :kill)
    end

    test "it can checkout and tarball a subfolder of a repo with additional files" do
      git = insert(:git_repository, url: "https://github.com/pluralsh/console.git")
      svc = insert(:service, repository: git, git: %{ref: "master", folder: "bin", files: ["AGENT_VERSION"]})

      {:ok, pid} = Discovery.start(git)

      files = fetch_and_extract(git, svc)
      for f <- ~w(.git-askpass .ssh-askpass ssh-add),
        do: assert files[f] == File.read!(Path.join("bin", f))

      assert files["AGENT_VERSION"]

      Process.exit(pid, :kill)
    end

    @tag :skip
    test "it can fetch constraints from the bootstrap repo" do
      git = insert(:git_repository, url: "https://github.com/pluralsh/bootstrap.git")
      svc = insert(:service, repository: git, git: %{ref: "main", folder: "resources/policy/constraints"})

      {:ok, _pid} = Discovery.start(git)

      {:ok, f} = Discovery.fetch(git, svc)
      {:ok, tmp} = Briefly.create()

      IO.binstream(f, 1024)
      |> Enum.into(File.stream!(tmp))
      File.close(f)

      {:ok, res} = :erl_tar.extract(tmp, [:compressed, :memory])
      files = Enum.into(res, %{}, fn {name, content} -> {to_string(name), to_string(content)} end)
      assert map_size(files) > 0
    end

    test "busted credentials fail as expected" do
      git = insert(:git_repository, auth_method: :ssh, url: "git@github.com:pluralsh/test-repo.git", private_key: "busted")

      {:ok, pid} = Discovery.start(git)

      :timer.sleep(:timer.seconds(2))

      git = refetch(git)
      assert git.health == :failed
      refute git.pulled_at

      Process.exit(pid, :kill)
    end

    @tag :skip
    test "it can fetch from private repos" do
      key = Path.join(System.user_home!(), ".ssh/id_ed25519") |> File.read!()
      git = insert(:git_repository, auth_method: :ssh, url: "git@github.com:pluralsh/test-repo.git", private_key: key)
      svc = insert(:service, repository: git, git: %{ref: "main", folder: "/"})

      {:ok, pid} = Discovery.start(git)

      {:ok, _} = Agent.fetch(pid, svc)

      git = refetch(git)
      assert git.health == :pullable
      assert git.pulled_at
    end

    @tag :skip
    test "it can fetch from https private repos" do
      git = insert(:git_repository, auth_method: :basic, url: "https://gitlab.com/mjg3/a-test-repo.git",
                    password: System.get_env("GITLAB_PAT"),
                    username: "mjg3"
            )
      svc = insert(:service, repository: git, git: %{ref: "main", folder: "/"})

      {:ok, pid} = Discovery.start(git)

      {:ok, _} = Agent.fetch(pid, svc)

      git = refetch(git)
      assert git.health == :pullable
      assert git.pulled_at
    end
  end

  describe "#digest/2" do
    test "it can fetch a unique sha for a folder in a repo" do
      git = insert(:git_repository, url: "https://github.com/pluralsh/console.git")
      svc = insert(:service, repository: git, git: %{ref: "master", folder: "bin"})

      {:ok, pid} = Discovery.start(git)

      {:ok, sha} = Discovery.digest(git, svc.git)

      assert is_binary(sha)

      {:ok, sha2} = Discovery.digest(git, svc.git)

      assert sha == sha2

      git = refetch(git)
      assert git.health == :pullable
      assert git.pulled_at

      assert Process.alive?(pid)

      Process.exit(pid, :kill)
    end
  end

  describe "#changes" do
    test "it can fetch the sha for a ref and the changes in a sha" do
      git = insert(:git_repository, url: "https://github.com/pluralsh/console.git")

      {:ok, pid} = Discovery.start(git)

      {:ok, sha} = Discovery.sha(git, "master")

      {:ok, :pass, msg} = Discovery.changes(git, nil, sha, "bin")

      assert is_binary(msg)

      Process.exit(pid, :kill)
    end
  end

  defp fetch_and_extract(git, svc) do
    {:ok, f} = Discovery.fetch(git, svc)
    {:ok, tmp} = Briefly.create()

    {:ok, f} = SmartFile.new(f)
               |> SmartFile.convert()
    IO.binstream(f, 1024)
    |> Enum.into(File.stream!(tmp))
    File.close(f)

    {:ok, res} = :erl_tar.extract(tmp, [:compressed, :memory])
    Enum.into(res, %{}, fn {name, content} -> {to_string(name), to_string(content)} end)
  end

  defp fetch_and_check(git, svc) do
    {:ok, f} = Discovery.fetch(git, svc)
    {:ok, tmp} = Briefly.create()

    {:ok, f} = SmartFile.new(f)
               |> SmartFile.convert()
    IO.binstream(f, 1024)
    |> Enum.into(File.stream!(tmp))
    File.close(f)

    {:ok, res} = :erl_tar.extract(tmp, [:compressed, :memory])
    files = Enum.into(res, %{}, fn {name, content} -> {to_string(name), to_string(content)} end)
    for f <- ~w(.git-askpass .ssh-askpass ssh-add),
      do: assert files[f] == File.read!(Path.join("bin", f))
  end
end
