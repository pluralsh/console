defmodule Console.Storage.GitTest do
  use ExUnit.Case, async: false
  use Mimic
  alias Console.Storage.Git
  alias Console.Commands.{Command, Plural}

  setup :set_mimic_global

  describe "#maybe_add_username/0" do
    test "it will rewrite a url" do
      Application.put_env(:console, :git_user_name, "user")
      expect(Command, :cmd, fn "git", ["config", "--global", "credential.https://github.com.username", "user"] ->
        {:ok, :finish}
      end)

      url = "https://github.com/pluralsh/example.git"
      {:ok, :finish} = Git.maybe_add_username(url)
    end

    test "ssh urls are ignored" do
      url = "git@github.com:pluralsh/example.git"
      {:ok, :ignore} = Git.maybe_add_username(url)
    end
  end

  describe "#init/0" do
    @tag :skip
    test "It will clone a repository" do
      :ok = Git.init()
      dir = Application.get_env(:console, :workspace_root)

      assert Path.join(dir, "plural-installations") |> File.dir?()
    end

    @tag :skip
    test "It will properly initialize a workspace" do
      myself = self()
      echo = fn val ->
        send myself, val
        :ok
      end
      git_fn = fn "git", args, _ -> echo.({:git, args}) end

      expect(Command, :cmd, git_fn)
      |> expect(:cmd, fn "git", args -> git_fn.("git", args, "rest") end)
      expect(Plural, :unlock, fn -> echo.(:unlock) end)

      :ok = Git.init()

      assert_receive {:git, ["clone" | _]}
      assert_receive {:git, ["config", "user.name" | _]}
      assert_receive {:git, ["config", "user.email" | _]}
      assert_receive :unlock
    end
  end
end
