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
        helm: %{url: "https://charts.example.com", chart: "test-chart", version: "1.0.0"},
        metadata: %{images: ["nginx:1.21", "redis:6.2", "postgres:13"]}
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
      assert result.images == ["nginx:1.21", "redis:6.2", "postgres:13"]
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
      assert result.images == []
      assert result.created_at == service.inserted_at
    end

    test "it properly formats images field for CSV encoding" do
      project = insert(:project, name: "csv-test-project")
      cluster = insert(:cluster, project: project)

      # Test with various image formats that might appear in CSV
      service = insert(:service, %{
        name: "csv-test-service",
        namespace: "csv-namespace",
        status: :healthy,
        cluster: cluster,
        metadata: %{images: [
          "nginx:1.21",
          "redis:6.2-alpine",
          "postgres:13",
          "my-registry.com/app:v1.2.3",
          "quay.io/operator:latest"
        ]}
      })

      result = Services.stream()
               |> Enum.find(& &1.service == "csv-test-service" && &1.namespace == "csv-namespace")

      # Verify images are returned as a list for proper CSV handling
      assert is_list(result.images)
      assert length(result.images) == 5
      assert "nginx:1.21" in result.images
      assert "redis:6.2-alpine" in result.images
      assert "postgres:13" in result.images
      assert "my-registry.com/app:v1.2.3" in result.images
      assert "quay.io/operator:latest" in result.images

      # Test that images can be properly joined for CSV (simulating CSV export)
      csv_images = Enum.join(result.images, ",")
      assert csv_images =~ "nginx:1.21"
      assert csv_images =~ "redis:6.2-alpine"
      assert csv_images =~ "postgres:13"
      assert csv_images =~ "my-registry.com/app:v1.2.3"
      assert csv_images =~ "quay.io/operator:latest"
    end
  end
end
