defmodule Console.Deployments.GitTest do
  use Console.DataCase, async: true
  alias Console.PubSub
  alias Console.Deployments.Git

  describe "#create_repository/2" do
    test "it can create a new git repository reference" do
      user = admin_user()

      {:ok, git} = Git.create_repository(%{
        url: "https://github.com/pluralsh/console.git",
      }, user)

      assert git.url == "https://github.com/pluralsh/console.git"

      assert_receive {:event, %PubSub.GitRepositoryCreated{item: ^git}}
    end

    test "it will respect rbac" do
      user = insert(:user)
      deployment_settings(git_bindings: [%{user_id: user.id}])
      {:ok, _} = Git.create_repository(%{
        url: "https://github.com/pluralsh/console.git",
      }, user)

      {:error, _} = Git.create_repository(%{
        url: "https://github.com/pluralsh/another.git",
      }, insert(:user))
    end
  end

  describe "#update_repository/2" do
    test "it can update a git repository" do
      git = insert(:git_repository)

      {:ok, update} = Git.update_repository(%{username: "uname"}, git.id, admin_user())

      assert update.username == "uname"

      assert_receive {:event, %PubSub.GitRepositoryUpdated{item: ^update}}
    end
  end

  describe "#delete_repository" do
    test "it will delete a git repository" do
      git = insert(:git_repository)

      {:ok, deleted} = Git.delete_repository(git.id, admin_user())

      refute refetch(deleted)
      assert_receive {:event, %PubSub.GitRepositoryDeleted{item: ^deleted}}
    end

    test "it will respect integrity constraints" do
      git = insert(:git_repository)
      insert(:service, repository: git)

      {:error, _} = Git.delete_repository(git.id, admin_user())
    end
  end
end
