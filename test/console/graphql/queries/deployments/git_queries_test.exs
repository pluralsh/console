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

      [%{"name" => "console", "versions" => [chart | _]} | _] = repo["charts"]
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
end
