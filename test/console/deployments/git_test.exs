defmodule Console.Deployments.GitTest do
  use Console.DataCase, async: true
  use Mimic
  alias Console.PubSub
  alias Console.Deployments.{Git, Services, Settings}
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
      assert git.private_key == "invalid-key\n\n"

      {:ok, git} = Git.create_repository(%{
        url: "https://github.com/pluralsh/test-repo.git",
        private_key: "invalid-key\n"
      }, user)

      assert git.url == "https://github.com/pluralsh/test-repo.git"
      assert git.private_key == "invalid-key\n\n"

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
      expect(Tentacat.Organizations.Hooks, :create, fn _, _, _ -> {:ok, %{"id" => "id"}, :ok} end)

      {:ok, conn} = Git.create_scm_connection(%{type: :github, owner: "pluralsh", name: "github", token: "pat-asdfa"}, admin)

      assert conn.type == :github
      assert conn.token == "pat-asdfa"
    end

    test "github accepts app auth" do
      admin = admin_user()

      {:ok, priv} = ExPublicKey.generate_key()
      {:ok, priv_string} = ExPublicKey.pem_encode(priv)

      {:ok, _} = Git.create_scm_connection(%{
        type: :github,
        name: "github",
        github: %{app_id: "1234", installation_id: "4353", private_key: priv_string}
      }, admin)
    end

    test "non-github requires a token" do
      admin = admin_user()

      {:ok, priv} = ExPublicKey.generate_key()
      {:ok, priv_string} = ExPublicKey.pem_encode(priv)

      {:error, _} = Git.create_scm_connection(%{
        type: :gitlab,
        name: "gitlab",
        github: %{app_id: "1234", installation_id: "4353", private_key: priv_string}
      }, admin)
    end

    test "github requires either a token or app auth" do
      admin = admin_user()

      {:error, _} = Git.create_scm_connection(%{type: :github, name: "github"}, admin)
    end

    test "nonadmins cannot create" do
      {:error, _} = Git.create_scm_connection(%{type: :github, name: "github", token: "pat-asdfa"}, insert(:user))
    end
  end

  describe "#update_scm_connection/3" do
    test "admins can update" do
      admin = admin_user()
      scm = insert(:scm_connection)

      {:ok, priv} = ExPublicKey.generate_key()
      {:ok, priv_string} = ExPublicKey.pem_encode(priv)

      {:ok, conn} = Git.update_scm_connection(%{
        type: :github,
        token: "pat-asdfa",
        signing_private_key: priv_string
      }, scm.id, admin)

      assert conn.id == scm.id
      assert conn.type == :github
      assert conn.token == "pat-asdfa"
      assert conn.signing_private_key == priv_string
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
      git = insert(:git_repository)

      {:ok, pr} = Git.create_pr_automation(%{
        name: "cluster-upgrade",
        title: "pr title",
        message: "pr message",
        connection_id: conn.id,
        repository_id: git.id,
        creates: %{templates: [%{source: "somewhere", destination: "elsewhere"}]}
      }, admin)

      assert pr.name == "cluster-upgrade"
      assert pr.connection_id == conn.id
      assert pr.repository_id == git.id
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
        updates: %{regexes: ["regex"], match_strategy: :any, files: ["file.yaml"], replace_template: "replace"},
        write_bindings: [%{user_id: user.id}],
        create_bindings: [%{user_id: user.id}],
        configuration: [
          %{name: "first", type: :int},
          %{name: "second", type: :string, validation: %{regex: "[a-z0-9]+:[a-z0-9]+(,[a-z0-9]+:[a-z0-9]+)*"}}
        ]
      )
      expect(Plural, :template, fn f, _, _ -> File.read(f) end)
      expect(Tentacat.Pulls, :create, fn _, "pluralsh", "console", %{head: "pr-test"} ->
        {:ok, %{"html_url" => "https://github.com/pr/url"}, %HTTPoison.Response{}}
      end)
      expect(Console.Deployments.Pr.Git, :setup, fn conn, "pluralsh/console", "pr-test" -> {:ok, conn} end)
      expect(Console.Deployments.Pr.Git, :commit, fn _, _ -> {:ok, ""} end)
      expect(Console.Deployments.Pr.Git, :push, fn _, "pr-test" -> {:ok, ""} end)

      {:ok, pr} = Git.create_pull_request(%{
        "first" => 10,
        "second" => "webapp:name1,cron:name2"
      }, pra.id, "pr-test", user)

      assert pr.cluster_id == pra.cluster_id
      assert pr.url == "https://github.com/pr/url"
      assert pr.title == pra.title

      assert_receive {:event, %PubSub.PullRequestCreated{item: ^pr}}
    end

    test "global writers can create a pull request off of a pr automation instance" do
      user = insert(:user)
      conn = insert(:scm_connection, token: "some-pat")
      deployment_settings(write_bindings: [%{user_id: user.id}])
      pra = insert(:pr_automation,
        identifier: "pluralsh/console",
        cluster: build(:cluster),
        connection: conn,
        updates: %{regexes: ["regex"], match_strategy: :any, files: ["file.yaml"], replace_template: "replace"},
        configuration: [
          %{name: "first", type: :int},
          %{name: "second", type: :string, validation: %{regex: "[a-z0-9]+:[a-z0-9]+(,[a-z0-9]+:[a-z0-9]+)*"}}
        ]
      )
      expect(Plural, :template, fn f, _, _ -> File.read(f) end)
      expect(Tentacat.Pulls, :create, fn _, "pluralsh", "console", %{head: "pr-test"} ->
        {:ok, %{"html_url" => "https://github.com/pr/url"}, %HTTPoison.Response{}}
      end)
      expect(Console.Deployments.Pr.Git, :setup, fn conn, "pluralsh/console", "pr-test" -> {:ok, conn} end)
      expect(Console.Deployments.Pr.Git, :commit, fn _, _ -> {:ok, ""} end)
      expect(Console.Deployments.Pr.Git, :push, fn _, "pr-test" -> {:ok, ""} end)

      {:ok, pr} = Git.create_pull_request(%{
        "first" => 10,
        "second" => "webapp:name1,cron:name2"
      }, pra.id, "pr-test", user)

      assert pr.cluster_id == pra.cluster_id
      assert pr.url == "https://github.com/pr/url"
      assert pr.title == pra.title

      assert_receive {:event, %PubSub.PullRequestCreated{item: ^pr}}
    end

    test "it can can create a pull request with a project config" do
      user = insert(:user)
      conn = insert(:scm_connection, token: "some-pat")
      insert(:project, name: "test")
      deployment_settings(write_bindings: [%{user_id: user.id}])
      pra = insert(:pr_automation,
        identifier: "pluralsh/console",
        cluster: build(:cluster),
        connection: conn,
        updates: %{regexes: ["regex"], match_strategy: :any, files: ["file.yaml"], replace_template: "replace"},
        configuration: [%{name: "first", type: :project}]
      )
      expect(Plural, :template, fn f, _, _ -> File.read(f) end)
      expect(Tentacat.Pulls, :create, fn _, "pluralsh", "console", %{head: "pr-test"} ->
        {:ok, %{"html_url" => "https://github.com/pr/url"}, %HTTPoison.Response{}}
      end)
      expect(Console.Deployments.Pr.Git, :setup, fn conn, "pluralsh/console", "pr-test" -> {:ok, conn} end)
      expect(Console.Deployments.Pr.Git, :commit, fn _, _ -> {:ok, ""} end)
      expect(Console.Deployments.Pr.Git, :push, fn _, "pr-test" -> {:ok, ""} end)

      {:ok, pr} = Git.create_pull_request(%{
        "first" => "test"
      }, pra.id, "pr-test", user)

      assert pr.cluster_id == pra.cluster_id
      assert pr.url == "https://github.com/pr/url"
      assert pr.title == pra.title

      assert_receive {:event, %PubSub.PullRequestCreated{item: ^pr}}
    end

    test "it will reject a pull request w/o valid configuration" do
      user = insert(:user)
      conn = insert(:scm_connection, token: "some-pat")
      pra = insert(:pr_automation,
        identifier: "pluralsh/console",
        cluster: build(:cluster),
        connection: conn,
        updates: %{regexes: ["regex"], match_strategy: :any, files: ["file.yaml"], replace_template: "replace"},
        write_bindings: [%{user_id: user.id}],
        create_bindings: [%{user_id: user.id}],
        configuration: [
          %{name: "first", type: :int},
          %{name: "second", type: :string, validation: %{regex: "[a-z0-9]+:[a-z0-9]+(,[a-z0-9]+:[a-z0-9]+)*"}}
        ]
      )

      {:error, err} = Git.create_pull_request(%{
        "first" => 10,
        "second" => "bogus"
      }, pra.id, "pr-test", user)

      assert err =~ "does not match regex"
    end

    test "it will reject a pull request for name duplication" do
      user = insert(:user)
      conn = insert(:scm_connection, token: "some-pat")
      insert(:project, name: "bogus")
      pra = insert(:pr_automation,
        identifier: "pluralsh/console",
        cluster: build(:cluster),
        connection: conn,
        updates: %{regexes: ["regex"], match_strategy: :any, files: ["file.yaml"], replace_template: "replace"},
        write_bindings: [%{user_id: user.id}],
        create_bindings: [%{user_id: user.id}],
        configuration: [
          %{name: "first", type: :int},
          %{name: "second", type: :string, validation: %{uniq_by: %{scope: :project}}}
        ]
      )

      {:error, err} = Git.create_pull_request(%{
        "first" => 10,
        "second" => "bogus"
      }, pra.id, "pr-test", user)

      assert err =~ "there is already a project with name"
    end

    test "it will reject a pull request w/ empty string configs" do
      user = insert(:user)
      conn = insert(:scm_connection, token: "some-pat")
      pra = insert(:pr_automation,
        identifier: "pluralsh/console",
        cluster: build(:cluster),
        connection: conn,
        updates: %{regexes: ["regex"], match_strategy: :any, files: ["file.yaml"], replace_template: "replace"},
        write_bindings: [%{user_id: user.id}],
        create_bindings: [%{user_id: user.id}],
        configuration: [
          %{name: "first", type: :int},
          %{name: "second", type: :string}
        ]
      )

      {:error, _} = Git.create_pull_request(%{
        "first" => 10,
        "second" => ""
      }, pra.id, "pr-test", user)
    end

    test "it will reject a pull request w/ invalid project names" do
      user = insert(:user)
      conn = insert(:scm_connection, token: "some-pat")
      insert(:project, name: "test")
      pra = insert(:pr_automation,
        identifier: "pluralsh/console",
        cluster: build(:cluster),
        connection: conn,
        updates: %{regexes: ["regex"], match_strategy: :any, files: ["file.yaml"], replace_template: "replace"},
        write_bindings: [%{user_id: user.id}],
        create_bindings: [%{user_id: user.id}],
        configuration: [%{name: "project", type: :project}]
      )

      {:error, _} = Git.create_pull_request(%{
        "first" => "wrong",
      }, pra.id, "pr-test", user)
    end

    test "it will reject a pull request w/ invalid cluster handles" do
      user = insert(:user)
      conn = insert(:scm_connection, token: "some-pat")
      insert(:cluster, handle: "test")
      pra = insert(:pr_automation,
        identifier: "pluralsh/console",
        cluster: build(:cluster),
        connection: conn,
        updates: %{regexes: ["regex"], match_strategy: :any, files: ["file.yaml"], replace_template: "replace"},
        write_bindings: [%{user_id: user.id}],
        create_bindings: [%{user_id: user.id}],
        configuration: [%{name: "cluster", type: :cluster}]
      )

      {:error, _} = Git.create_pull_request(%{
        "first" => "wrong",
      }, pra.id, "pr-test", user)
    end

    test "it can create a pull request with a github app" do
      user = insert(:user)
      {:ok, pem_string, _} = Console.keypair("console@plural.sh")
      conn = insert(:scm_connection, token: nil, github: %{app_id: "123", installation_id: "234", private_key: pem_string})
      pra = insert(:pr_automation,
        identifier: "pluralsh/console",
        cluster: build(:cluster),
        connection: conn,
        updates: %{regexes: ["regex"], match_strategy: :any, files: ["file.yaml"], replace_template: "replace"},
        write_bindings: [%{user_id: user.id}],
        create_bindings: [%{user_id: user.id}]
      )
      expect(Plural, :template, fn f, _, _ -> File.read(f) end)
      expect(Tentacat.App.Installations, :token, fn _, "234" ->
        {:ok, %{"token" => "some-pat"}, %HTTPoison.Response{}}
      end)
      expect(Tentacat.Pulls, :create, fn _, "pluralsh", "console", %{head: "pr-test"} ->
        {:ok, %{"html_url" => "https://github.com/pr/url"}, %HTTPoison.Response{}}
      end)
      expect(Console.Deployments.Pr.Git, :setup, fn conn, "pluralsh/console", "pr-test" -> {:ok, conn} end)
      expect(Console.Deployments.Pr.Git, :commit, fn _, _ -> {:ok, ""} end)
      expect(Console.Deployments.Pr.Git, :push, fn _, "pr-test" -> {:ok, ""} end)

      {:ok, pr} = Git.create_pull_request(%{}, pra.id, "pr-test", user)

      assert pr.cluster_id == pra.cluster_id
      assert pr.url == "https://github.com/pr/url"
      assert pr.title == pra.title

      assert_receive {:event, %PubSub.PullRequestCreated{item: ^pr}}
    end

    test "users cannot create if they don't have permissions" do
      user = insert(:user)
      conn = insert(:scm_connection, token: "some-pat")
      pra = insert(:pr_automation,
        identifier: "pluralsh/console",
        cluster: build(:cluster),
        connection: conn
      )

      {:error, _} = Git.create_pull_request(%{}, pra.id, "pr-test", user)
    end
  end

  describe "#create_pull_request/2" do
    test "admins can create pr pointers" do
      admin = admin_user()

      {:ok, pr} = Git.create_pull_request(%{
        title: "pr",
        url: "https://github.com/org/name/pulls/2",
      }, admin)

      assert pr.title == "pr"
      assert pr.url == "https://github.com/org/name/pulls/2"
    end

    test "nonadmins cannot create" do
      {:error, _} = Git.create_pull_request(%{
        title: "pr",
        url: "https://github.com/org/name/pulls/2",
      }, insert(:user))
    end
  end

  describe "#upsert_observer/2" do
    test "it can create a new observer record" do
      admin = admin_user()
      pra = insert(:pr_automation)

      {:ok, observer} = Git.upsert_observer(%{
        name: "observer",
        initial: "v0.11.3",
        target: %{helm: %{url: "https://pluralsh.github.io/console", chart: "console"}},
        actions: [
          %{type: :pr, configuration: %{
            pr: %{automation_id: pra.id, context: %{some: "$value"}}
          }}
        ],
        crontab: "*/5 * * *",
      }, admin)

      assert observer.name == "observer"
      assert observer.target.helm.url == "https://pluralsh.github.io/console"
      assert observer.target.helm.chart == "console"
      assert hd(observer.actions).type == :pr
      assert hd(observer.actions).configuration.pr.automation_id == pra.id
      assert observer.crontab == "*/5 * * *"
      assert observer.next_run_at
      assert observer.last_run_at
      assert observer.last_value == "v0.11.3"
      assert observer.project_id == Settings.default_project!().id
    end

    test "it can update an existing observer record" do
      admin = admin_user()
      obs = insert(:observer)

      {:ok, updated} = Git.upsert_observer(%{
        name: obs.name,
        target: %{helm: %{url: "https://pluralsh.github.io/console", chart: "console"}},
        actions: [
          %{type: :pr, configuration: %{
            pr: %{automation_id: insert(:pr_automation).id, context: %{some: "$value"}}
          }}
        ],
        crontab: "*/5 * * *",
      }, admin)

      assert updated.id == obs.id
      assert updated.target.helm.url == "https://pluralsh.github.io/console"
    end

    test "project writers can create" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      pra = insert(:pr_automation)

      {:ok, observer} = Git.upsert_observer(%{
        name: "observer",
        target: %{helm: %{url: "https://pluralsh.github.io/console", chart: "console"}},
        actions: [
          %{type: :pr, configuration: %{
            pr: %{automation_id: pra.id, context: %{some: "$value"}}
          }}
        ],
        project_id: project.id,
        crontab: "*/5 * * *",
      }, user)

      assert observer.name == "observer"
      assert observer.target.helm.url == "https://pluralsh.github.io/console"
      assert hd(observer.actions).type == :pr
      assert hd(observer.actions).configuration.pr.automation_id == pra.id
      assert observer.crontab == "*/5 * * *"
      assert observer.next_run_at
      assert observer.last_run_at
      assert observer.project_id == project.id
    end

    test "randos cannot create" do
      pra = insert(:pr_automation)

      {:error, _} = Git.upsert_observer(%{
        name: "observer",
        target: %{helm: %{url: "https://pluralsh.github.io/console", chart: "console"}},
        actions: [
          %{type: :pr, pr: %{automation_id: pra.id, context: %{some: "$value"}}}
        ],
        crontab: "*/5 * * *",
      }, insert(:user))
    end
  end

  describe "#kick_observer/2" do
    test "it can kick an observer" do
      obs = insert(:observer)
      now = Timex.now()
      {:ok, kicked} = Git.kick_observer(obs.id, admin_user())

      assert kicked.id == obs.id
      assert Timex.after?(kicked.next_run_at, now)
    end

    test "randos cannot kick" do
      obs = insert(:observer)
      {:error, _} = Git.kick_observer(obs.id, insert(:user))
    end
  end

  describe "#delete_observer/2" do
    test "writers can delete observers" do
      obs = insert(:observer)

      {:ok, deleted} = Git.delete_observer(obs.id, admin_user())

      assert deleted.id == obs.id
      refute refetch(obs)
    end

    test "randos cannot delete" do
      obs = insert(:observer)

      {:error, _} = Git.delete_observer(obs.id, insert(:user))
    end
  end

  describe "#upsert_catalog/2" do
    test "it can create a new catalog record" do
      admin = admin_user()

      {:ok, catalog} = Git.upsert_catalog(%{
        name: "catalog",
        author: "Plural",
      }, admin)

      assert catalog.name == "catalog"
      assert catalog.author == "Plural"
      assert catalog.project_id == Settings.default_project!().id
    end

    test "it can update an existing catalog record" do
      admin = admin_user()
      cat = insert(:catalog)
      group = insert(:group)

      {:ok, updated} = Git.upsert_catalog(%{
        name: cat.name,
        read_bindings: [%{group_id: group.id}]
      }, admin)

      assert updated.id == cat.id
      [read] = updated.read_bindings
      assert read.group_id == group.id
    end

    test "project writers can create" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])

      {:ok, catalog} = Git.upsert_catalog(%{
        name: "catalog",
        author: "Plural",
        project_id: project.id,
      }, user)

      assert catalog.name == "catalog"
      assert catalog.project_id == project.id
    end

    test "randos cannot create" do
      {:error, _} = Git.upsert_catalog(%{
        name: "catalog",
      }, insert(:user))
    end
  end

  describe "#delete_catalog/2" do
    test "writers can delete catalogs" do
      cat = insert(:catalog)

      {:ok, deleted} = Git.delete_catalog(cat.id, admin_user())

      assert deleted.id == cat.id
      refute refetch(cat)
    end

    test "randos cannot delete" do
      cat = insert(:catalog)

      {:error, _} = Git.delete_catalog(cat.id, insert(:user))
    end
  end

  describe "setupRenovate" do
    test "it can create a service for renovate" do
      git = insert(:git_repository, url: "https://github.com/pluralsh/scaffolds.git")
      bot = insert(:user, bot_name: "console", roles: %{admin: true})
      scm = insert(:scm_connection)
      cluster = insert(:cluster, self: true)

      {:ok, svc} = Git.setup_renovate(scm.id, ["some/repo", "other/repo"], admin_user())

      assert svc.name == "plural-renovate"
      assert svc.namespace == "plural-renovate"
      assert svc.repository_id == git.id
      assert svc.cluster_id == cluster.id
      assert svc.git.ref == "main"
      assert svc.git.folder == "addons/plural-renovate"

      {:ok, conf} = Services.configuration(svc)
      [access] = Console.Repo.all(Console.Schema.AccessToken)

      assert access.user_id == bot.id

      assert conf["renovateToken"] == scm.token
      assert conf["consoleToken"] == access.token
      assert conf["platform"] == "#{scm.type}"
      assert conf["repositories"] == "some/repo,other/repo"
      assert conf["consoleUrl"] == Console.url("/gql")

      [mgmt] = Console.Repo.all(Console.Schema.DependencyManagementService)

      assert mgmt.service_id == svc.id
      assert mgmt.connection_id == scm.id
    end
  end

  describe "#upsert_pr_governance/2" do
    test "it can create a new governance controller" do
      admin = admin_user()
      conn = insert(:scm_connection)

      {:ok, governance} = Git.upsert_governance(%{name: "governance", connection_id: conn.id}, admin)

      assert governance.name == "governance"
      assert governance.connection_id == conn.id
    end

    test "it can update an existing governance controller" do
      admin = admin_user()
      governance = insert(:pr_governance)

      {:ok, updated} = Git.upsert_governance(%{name: governance.name, configuration: %{webhook: %{url: "https://webhook.url"}}}, admin)

      assert updated.id == governance.id
      assert updated.configuration.webhook.url == "https://webhook.url"
    end

    test "randos cannot create" do
      {:error, _} = Git.upsert_governance(%{name: "governance", connection_id: insert(:scm_connection).id}, insert(:user))
    end
  end

  describe "#delete_pr_governance/2" do
    test "it can delete a governance controller" do
      governance = insert(:pr_governance)

      {:ok, deleted} = Git.delete_governance(governance.id, admin_user())

      assert deleted.id == governance.id
      refute refetch(governance)
    end

    test "random users cannot delete" do
      governance = insert(:pr_governance)

      {:error, _} = Git.delete_governance(governance.id, insert(:user))
    end
  end

  describe "#confirm_pull_request/1" do
    test "it can confirm a pull request" do
      governance = insert(:pr_governance, configuration: %{webhook: %{url: "https://webhook.url"}})
      pr = insert(:pull_request, url: "https://github.com/pluralsh/console/pull/1", governance: governance)

      expect(HTTPoison, :post, fn "https://webhook.url/v1/confirm", _, _ ->
        body = Jason.encode!(%{state: %{service_now_id: "1234567890"}})
        {:ok, %HTTPoison.Response{status_code: 200, body: body}}
      end)

      expect(Tentacat.Pulls.Reviews, :create, fn _, "pluralsh", "console", "1", _ ->
        {:ok, %{"id" => "id"}, :ok}
      end)

      {:ok, _} = Git.confirm_pull_request(pr)

      assert refetch(pr).approved
    end
  end
end

defmodule Console.Deployments.GitSyncTest do
  use Console.DataCase, async: false
  alias Console.Deployments.Git
  use Mimic

  setup :set_mimic_global

  describe "#create_pull_request/4" do
    test "it can create a pull request referencing an external git repo" do
      user = insert(:user)
      conn = insert(:scm_connection, token: "some-pat")
      git = insert(:git_repository, url: "https://github.com/pluralsh/console.git")
      pra = insert(:pr_automation,
        identifier: "pluralsh/console",
        cluster: build(:cluster),
        connection: conn,
        repository: git,
        creates: %{templates: [%{source: "agent.yaml", destination: "some/folder/agent.yaml"}], git: %{ref: "master", folder: "test-apps/k3s"}},
        write_bindings: [%{user_id: user.id}],
        create_bindings: [%{user_id: user.id}]
      )

      expect(Console.Commands.Plural, :template, fn f, _, ext ->
        with true <- File.dir?(ext),
          do: File.read(f)
      end)
      expect(Tentacat.Pulls, :create, fn _, "pluralsh", "console", %{head: "pr-test"} ->
        {:ok, %{"html_url" => "https://github.com/pr/url"}, %HTTPoison.Response{}}
      end)
      expect(Console.Deployments.Pr.Git, :setup, fn conn, "pluralsh/console", "pr-test" -> {:ok, conn} end)
      expect(Console.Deployments.Pr.Git, :commit, fn _, _ -> {:ok, ""} end)
      expect(Console.Deployments.Pr.Git, :push, fn _, "pr-test" -> {:ok, ""} end)

      {:ok, pr} = Git.create_pull_request(%{}, pra.id, "pr-test", user)

      assert pr.cluster_id == pra.cluster_id
      assert pr.url == "https://github.com/pr/url"
      assert pr.title == pra.title
    end
  end

  describe "#register_github_app/3" do
    test "it can register a github app" do
      {:ok, priv} = ExPublicKey.generate_key()
      {:ok, priv_string} = ExPublicKey.pem_encode(priv)
      Application.put_env(:console, :github_app_pem, priv_string)

      {:ok, scm} = Git.register_github_app("plural", "1234567890", admin_user())

      assert scm.name == "plural"
      assert scm.type == :github
      assert scm.github.app_id == Console.conf(:github_app_id)
      assert scm.github.installation_id == "1234567890"
      assert scm.github.private_key == priv_string
    end
  end
end
