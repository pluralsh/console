defmodule Console.Deployments.GitTest do
  use Console.DataCase, async: true
  use Mimic
  alias Console.PubSub
  alias Console.Deployments.Git
  alias Console.Commands.Plural

  describe "#create_repository/2" do
    test "it can create a new git repository reference" do
      user = admin_user()

      {:ok, git} = Git.create_repository(%{
        url: "https://github.com/pluralsh/console.git",
      }, user)

      assert git.url == "https://github.com/pluralsh/console.git"

      assert_receive {:event, %PubSub.GitRepositoryCreated{item: ^git}}
    end

    test "it will normalize common private key misformatting" do
      user = admin_user()

      {:ok, git} = Git.create_repository(%{
        url: "git@github.com:pluralsh/console.git",
        private_key: "invalid-key"
      }, user)

      assert git.url == "git@github.com:pluralsh/console.git"
      assert git.private_key == "invalid-key\n"

      {:ok, git} = Git.create_repository(%{
        url: "https://github.com/pluralsh/test-repo.git",
        private_key: "invalid-key\n"
      }, user)

      assert git.url == "https://github.com/pluralsh/test-repo.git"
      assert git.private_key == "invalid-key\n"

      assert_receive {:event, %PubSub.GitRepositoryCreated{item: ^git}}
    end

    test "it will suss out invalid git urls" do
      user = admin_user()

      {:error, _} = Git.create_repository(%{
        url: "git@github.com/pluralsh/console.git",
        private_key: "invalid-key"
      }, user)
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

  describe "#create_scm_connection/2" do
    test "admins can create" do
      admin = admin_user()

      {:ok, conn} = Git.create_scm_connection(%{type: :github, name: "github", token: "pat-asdfa"}, admin)

      assert conn.type == :github
      assert conn.token == "pat-asdfa"
    end

    test "nonadmins cannot create" do
      {:error, _} = Git.create_scm_connection(%{type: :github, name: "github", token: "pat-asdfa"}, insert(:user))
    end
  end

  describe "#update_scm_connection/3" do
    test "admins can update" do
      admin = admin_user()
      scm = insert(:scm_connection)

      {:ok, conn} = Git.update_scm_connection(%{type: :github, token: "pat-asdfa"}, scm.id, admin)

      assert conn.id == scm.id
      assert conn.type == :github
      assert conn.token == "pat-asdfa"
    end

    test "nonadmins cannot update" do
      scm = insert(:scm_connection)
      {:error, _} = Git.update_scm_connection(%{type: :github, token: "pat-asdfa"}, scm.id, insert(:user))
    end
  end

  describe "#delete_scm_connection/3" do
    test "admins can delete" do
      admin = admin_user()
      scm = insert(:scm_connection)

      {:ok, conn} = Git.delete_scm_connection(scm.id, admin)

      assert conn.id == scm.id
      refute refetch(scm)
    end

    test "nonadmins cannot delete" do
      scm = insert(:scm_connection)
      {:error, _} = Git.delete_scm_connection(scm.id, insert(:user))
    end
  end

  describe "#create_scm_webhook/2" do
    test "admins can create" do
      admin = admin_user()

      {:ok, hook} = Git.create_scm_webhook(%{type: :github, hmac: "hmac"}, admin)

      assert hook.type == :github
      assert hook.hmac == "hmac"
    end

    test "nonadmins cannot create" do
      {:error, _} = Git.create_scm_webhook(%{type: :github, hmac: "hmac"}, insert(:user))
    end
  end

  describe "#update_scm_webhook/3" do
    test "admins can update" do
      admin = admin_user()
      scm = insert(:scm_webhook)

      {:ok, hook} = Git.update_scm_webhook(%{type: :github, hmac: "hmac"}, scm.id, admin)

      assert hook.id == scm.id
      assert hook.type == :github
      assert hook.hmac == "hmac"
    end

    test "nonadmins cannot update" do
      scm = insert(:scm_webhook)
      {:error, _} = Git.update_scm_webhook(%{type: :github, hmac: "hmac"}, scm.id, insert(:user))
    end
  end

  describe "#delete_scm_webhook/3" do
    test "admins can delete" do
      admin = admin_user()
      scm = insert(:scm_webhook)

      {:ok, hook} = Git.delete_scm_webhook(scm.id, admin)

      assert hook.id == scm.id
      refute refetch(scm)
    end

    test "nonadmins cannot delete" do
      scm = insert(:scm_webhook)
      {:error, _} = Git.delete_scm_webhook(scm.id, insert(:user))
    end
  end

  describe "#create_pr_automation/2" do
    test "admins can create" do
      admin = admin_user()
      conn = insert(:scm_connection)

      {:ok, pr} = Git.create_pr_automation(%{
        name: "cluster-upgrade",
        title: "pr title",
        message: "pr message",
        connection_id: conn.id
      }, admin)

      assert pr.name == "cluster-upgrade"
      assert pr.connection_id == conn.id
      assert pr.message == "pr message"
    end

    test "nonadmins cannot create" do
      conn = insert(:scm_connection)
      {:error, _} = Git.create_pr_automation(%{
        name: "cluster-upgrade",
        message: "pr message",
        connection_id: conn.id
      }, insert(:user))
    end
  end

  describe "#update_pr_automation/3" do
    test "admins can update" do
      admin = admin_user()
      pr = insert(:pr_automation)

      {:ok, up} = Git.update_pr_automation(%{name: "new name"}, pr.id, admin)

      assert up.id == pr.id
      assert up.name == "new name"
    end

    test "nonadmins cannot update" do
      pr = insert(:pr_automation)
      {:error, _} = Git.update_pr_automation(%{name: "new name"}, pr.id, insert(:user))
    end
  end

  describe "#delete_pr_automation/3" do
    test "admins can delete" do
      admin = admin_user()
      pr = insert(:pr_automation)

      {:ok, del} = Git.delete_pr_automation(pr.id, admin)

      assert del.id == pr.id
      refute refetch(del)
    end

    test "nonadmins cannot delete" do
      pr = insert(:pr_automation)
      {:error, _} = Git.delete_pr_automation(pr.id, insert(:user))
    end
  end

  describe "#create_pull_request/4" do
    test "it can create a pull request off of a pr automation instance" do
      user = insert(:user)
      conn = insert(:scm_connection, token: "some-pat")
      pra = insert(:pr_automation,
        identifier: "pluralsh/console",
        cluster: build(:cluster),
        connection: conn,
        write_bindings: [%{user_id: user.id}],
        create_bindings: [%{user_id: user.id}]
      )
      expect(Plural, :template, fn f -> File.read(f) end)
      expect(Tentacat.Pulls, :create, fn _, "pluralsh", "console", %{head: "pr-test"} ->
        {:ok, %{"html_url" => "https://github.com/pr/url"}}
      end)
      expect(Console.Deployments.Pr.Git, :setup, fn conn, "pluralsh/console", "pr-test" -> {:ok, conn} end)
      expect(Console.Deployments.Pr.Git, :commit, fn _, _ -> {:ok, ""} end)
      expect(Console.Deployments.Pr.Git, :push, fn _, "pr-test" -> {:ok, ""} end)

      {:ok, pr} = Git.create_pull_request(%{}, pra.id, "pr-test", user)

      assert pr.cluster_id == pra.cluster_id
      assert pr.url == "https://github.com/pr/url"
      assert pr.title == pra.title
    end

    test "users cannot create if they don't have permissions" do
      user = insert(:user)
      conn = insert(:scm_connection, token: "some-pat")
      pra = insert(:pr_automation,
        identifier: "pluralsh/console",
        cluster: build(:cluster),
        connection: conn,
      )

      {:error, _} = Git.create_pull_request(%{}, pra.id, "pr-test", user)
    end
  end
end
