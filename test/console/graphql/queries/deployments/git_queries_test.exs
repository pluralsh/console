defmodule Console.GraphQl.Deployments.GitQueriesTest do
  use Console.DataCase, async: true
  alias Kube.HelmRepository
  use Mimic

  describe "gitRepositories" do
    test "it can list git repositories" do
      repos = insert_list(3, :git_repository)

      {:ok, %{data: %{"gitRepositories" => found}}} = run_query("""
        query {
          gitRepositories(first: 5) {
            edges { node { id url } }
          }
        }
      """, %{}, %{current_user: admin_user()})

      assert from_connection(found)
             |> ids_equal(repos)
      assert from_connection(found)
             |> Enum.all?(& &1["url"])
    end
  end

  describe "helmRepositories" do
    test "it can list git repositories" do
      repos = insert_list(3, :helm_repository)

      {:ok, %{data: %{"helmRepositories" => found}}} = run_query("""
        query {
          helmRepositories(first: 5) {
            edges { node { id url } }
          }
        }
      """, %{}, %{current_user: admin_user()})

      assert from_connection(found)
             |> ids_equal(repos)
      assert from_connection(found)
             |> Enum.all?(& &1["url"])
    end
  end

  describe "gitRepository" do
    test "it can fetch a git repository by id" do
      repo = insert(:git_repository)

      {:ok, %{data: %{"gitRepository" => found}}} = run_query("""
        query Git($id: ID!) {
          gitRepository(id: $id) { id }
        }
      """, %{"id" => repo.id}, %{current_user: admin_user()})

      assert found["id"] == repo.id
    end

    test "it can fetch a git repository by url" do
      repo = insert(:git_repository)

      {:ok, %{data: %{"gitRepository" => found}}} = run_query("""
        query Git($url: String!) {
          gitRepository(url: $url) { id }
        }
      """, %{"url" => repo.url}, %{current_user: admin_user()})

      assert found["id"] == repo.id
    end
  end

  describe "helmRepository" do
    test "it can fetch a helm repository by url" do
      repo = insert(:helm_repository)

      {:ok, %{data: %{"helmRepository" => found}}} = run_query("""
        query Git($url: String!) {
          helmRepository(url: $url) { id }
        }
      """, %{"url" => repo.url}, %{current_user: admin_user()})

      assert found["id"] == repo.id
    end
  end

  describe "fluxHelmRepository" do
    test "it can fetch the charts from a helm repository" do
      expect(Kube.Client, :get_helm_repository, fn "helm-charts", "console" ->
        {:ok, %HelmRepository{
          status: %HelmRepository.Status{
            artifact: %HelmRepository.Status.Artifact{url: "https://pluralsh.github.io/console/index.yaml"}
          }
        }}
      end)

      {:ok, %{data: %{"fluxHelmRepository" => repo}}} = run_query("""
        query {
          fluxHelmRepository(namespace: "helm-charts", name: "console") {
            charts {
              name
              versions { name version appVersion }
            }
          }
        }
      """, %{}, %{current_user: admin_user()})

      %{"console" => %{"versions" => [chart | _]}} = Map.new(repo["charts"], & {&1["name"], &1})
      assert chart["name"] == "console"
      assert chart["version"]
      assert chart["appVersion"]
    end
  end

  describe "scmWebhooks" do
    test "it can list scm webhooks" do
      hooks = insert_list(3, :scm_webhook)

      {:ok, %{data: %{"scmWebhooks" => found}}} = run_query("""
        query {
          scmWebhooks(first: 5) {
            edges { node { id } }
          }
        }
      """, %{}, %{current_user: insert(:user)})

      assert from_connection(found)
             |> ids_equal(hooks)
    end
  end

  describe "pullRequests" do
    test "it can list pull requests" do
      user = insert(:user)
      prs = insert_list(3, :pull_request)

      {:ok, %{data: %{"pullRequests" => found}}} = run_query("""
        query {
          pullRequests(first: 5) {
            edges { node { id } }
          }
        }
      """, %{}, %{current_user: user})

      assert from_connection(found)
             |> ids_equal(prs)
    end
  end

  describe "observer" do
    test "it can fetch an observer by name" do
      observer = insert(:observer)

      {:ok, %{data: %{"observer" => found}}} = run_query("""
        query Observer($name: String!) {
          observer(name: $name) {
            id
            name
          }
        }
      """, %{"name" => observer.name}, %{current_user: insert(:user)})

      assert found["id"] == observer.id
      assert found["name"] == observer.name
    end
  end

  describe "observers" do
    test "it can fetch paginated observers" do
      observers = insert_list(3, :observer)

      {:ok, %{data: %{"observers" => found}}} = run_query("""
        query {
          observers(first: 5) {
            edges { node { id } }
          }
        }
      """, %{}, %{current_user: insert(:user)})

      assert from_connection(found)
             |> ids_equal(observers)
    end

    test "it can filter by project" do
      project = insert(:project)
      observers = insert_list(3, :observer, project: project)
      insert_list(3, :observer)

      {:ok, %{data: %{"observers" => found}}} = run_query("""
        query Observers($id: ID!) {
          observers(projectId: $id, first: 5) {
            edges { node { id } }
          }
        }
      """, %{"id" => project.id}, %{current_user: insert(:user)})

      assert from_connection(found)
             |> ids_equal(observers)
    end
  end

  describe "catalog" do
    test "it can fetch an catalog by name" do
      catalog = insert(:catalog)

      {:ok, %{data: %{"catalog" => found}}} = run_query("""
        query Catalog($name: String!) {
          catalog(name: $name) {
            id
            name
          }
        }
      """, %{"name" => catalog.name}, %{current_user: insert(:user)})

      assert found["id"] == catalog.id
      assert found["name"] == catalog.name
    end
  end

  describe "catalogs" do
    test "it can fetch paginated catalogs" do
      user = insert(:user)
      catalogs = insert_list(3, :catalog, read_bindings: [%{user_id: user.id}])

      {:ok, %{data: %{"catalogs" => found}}} = run_query("""
        query {
          catalogs(first: 5) {
            edges { node { id } }
          }
        }
      """, %{}, %{current_user: user})

      assert from_connection(found)
             |> ids_equal(catalogs)
    end

    test "it can filter by project" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      catalogs = insert_list(3, :catalog, project: project)
      insert_list(3, :catalog)

      {:ok, %{data: %{"catalogs" => found}}} = run_query("""
        query Catalogs($id: ID!) {
          catalogs(projectId: $id, first: 5) {
            edges { node { id } }
          }
        }
      """, %{"id" => project.id}, %{current_user: user})

      assert from_connection(found)
             |> ids_equal(catalogs)
    end
  end

  describe "scmWebhook" do
    test "it can fetch a scm webhook by id" do
      webhook = insert(:scm_webhook)

      {:ok, %{data: %{"scmWebhook" => found}}} = run_query("""
        query SCMWebhook($id: ID!) {
          scmWebhook(id: $id) {
            id
          }
        }
      """, %{"id" => webhook.id}, %{current_user: insert(:user)})

      assert found["id"] == webhook.id
    end

    test "it can fetch an scm webhook by external id" do
      webhook = insert(:scm_webhook)

      {:ok, %{data: %{"scmWebhook" => found}}} = run_query("""
        query SCMWebhook($externalId: String!) {
          scmWebhook(externalId: $externalId) {
            id
          }
        }
      """, %{"externalId" => webhook.external_id}, %{current_user: insert(:user)})

      assert found["id"] == webhook.id
    end
  end

  describe "prGovernance" do
    test "it can fetch a pr governance by id" do
      governance = insert(:pr_governance)

      {:ok, %{data: %{"prGovernance" => found}}} = run_query("""
        query PrGovernance($id: ID!) {
          prGovernance(id: $id) {
            id
          }
        }
      """, %{"id" => governance.id}, %{current_user: admin_user()})

      assert found["id"] == governance.id
    end

    test "it can fetch a pr governance by name" do
      governance = insert(:pr_governance)

      {:ok, %{data: %{"prGovernance" => found}}} = run_query("""
        query PrGovernance($name: String!) {
          prGovernance(name: $name) {
            id
          }
        }
      """, %{"name" => governance.name}, %{current_user: admin_user()})

      assert found["id"] == governance.id
    end
  end
end
