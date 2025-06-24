defmodule Console.Compliance.Datasource.ServicesTest do
  use Console.DataCase, async: true
  alias Console.Compliance.Datasource.Services

  describe "stream/0" do
    test "it returns a stream of service data" do
      # Create test data
      project = insert(:project, name: "test-project")
      git_repo = insert(:git_repository, url: "https://github.com/example/repo.git")
      revision = insert(:revision, sha: "abc123")
      cluster = insert(:cluster, handle: "test-cluster", project: project)

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

      # Get the first item from the stream
      [result] = Services.stream() |> Enum.take(1)

      # Assert the transformed data matches expectations
      assert result.cluster == "test-cluster"
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
      # Create a service with minimal data
      project = insert(:project, name: "test-project")
      cluster = insert(:cluster, handle: "test-cluster", project: project)

      # Build service without using the factory defaults
      service = %Console.Schema.Service{
        name: "minimal-service",
        namespace: "test-namespace",
        status: :healthy,
        cluster: cluster,
        write_policy_id: Ecto.UUID.generate(),
        read_policy_id: Ecto.UUID.generate()
      } |> Console.Repo.insert!()

      # Get the first item from the stream
      [result] = Services.stream() |> Enum.take(1)

      # Assert the transformed data handles nil values
      assert result.cluster == "test-cluster"
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
