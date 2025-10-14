defmodule Console.Compliance.Datasource.ServicesTest do
  use Console.DataCase, async: true
  alias Console.Compliance.Datasource.Services
  alias Console.Repo

  describe "stream/0" do
    test "it returns a stream of service data" do
      project = insert(:project, name: "test-project")
      git_repo = insert(:git_repository, url: "https://github.com/example/repo.git")
      revision = insert(:revision, sha: "abc123")
      cluster = insert(:cluster, project: project)

      service = insert(:service, %{
        name: "test-service",
        namespace: "test-namespace",
        status: :healthy,
        repository: git_repo,
        revision: revision,
        cluster: cluster,
        git: %{ref: "main", folder: "k8s"},
        helm: %{url: "https://charts.example.com", chart: "test-chart", version: "1.0.0"}
      })

      # Find our specific service in the stream by matching its name and namespace
      result = Services.stream()
               |> Enum.find(& &1.service == "test-service" && &1.namespace == "test-namespace")

      assert result.service == "test-service"
      assert result.project == "test-project"
      assert result.namespace == "test-namespace"
      assert result.health == :healthy
      assert result.sha == "abc123"
      assert result.repository == "https://github.com/example/repo.git"
      assert result.git_ref == "main"
      assert result.git_folder == "k8s"
      assert result.helm_url == "https://charts.example.com"
      assert result.helm_chart == "test-chart"
      assert result.helm_version == "1.0.0"
      assert result.created_at == service.inserted_at
    end

    test "it handles services with missing relationships" do
      project = insert(:project, name: "test-project")
      cluster = insert(:cluster, project: project)

      service = %Console.Schema.Service{
        name: "minimal-service",
        namespace: "test-namespace",
        status: :healthy,
        cluster: cluster,
        write_policy_id: Ecto.UUID.generate(),
        read_policy_id: Ecto.UUID.generate()
      } |> Repo.insert!()

      result = Services.stream()
               |> Enum.find(& &1.service == "minimal-service" && &1.namespace == "test-namespace")

      assert result.service == "minimal-service"
      assert result.project == "test-project"
      assert result.namespace == "test-namespace"
      assert result.health == :healthy
      assert result.sha == nil
      assert result.repository == nil
      assert result.git_ref == nil
      assert result.git_folder == nil
      assert result.helm_url == nil
      assert result.helm_chart == nil
      assert result.helm_version == nil
      assert result.created_at == service.inserted_at
    end
  end
end
