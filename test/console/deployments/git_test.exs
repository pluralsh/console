defmodule Console.Deployments.GitTest do
  use Console.DataCase, async: true
  alias Console.Deployments.Git

  describe "#create_repository/2" do
    test "it can create a new git repository reference" do
      user = admin_user()

      {:ok, git} = Git.create_repository(%{
        url: "https://github.com/pluralsh/console.git",
      }, user)

      assert git.url == "https://github.com/pluralsh/console.git"
    end
  end
end
