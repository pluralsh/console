defmodule Console.AI.Tools.Workbench.Infrastructure.CatalogToolsTest do
  use Console.DataCase, async: true

  alias Console.AI.Tool
  alias Console.AI.Tools.Workbench.Infrastructure.{
    Cluster,
    ClusterList,
    ClusterTags,
    ClusterServices,
    Projects,
    ServiceInspect,
    StackInspect,
    StackList,
    VulnReports,
    Vulns
  }
  alias Console.Schema.VulnerabilityReport

  describe "ClusterList (plrl_clusters)" do
    test "returns {:ok, json} including clusters the user can read" do
      user = insert(:user)
      cluster = insert(:cluster, read_bindings: [%{user_id: user.id}])

      assert {:ok, parsed} = Tool.validate(%ClusterList{user: user}, %{})
      assert {:ok, json} = ClusterList.implement(parsed)
      assert {:ok, list} = Jason.decode(json)
      assert is_list(list)
      assert Enum.any?(list, &(&1["id"] == cluster.id))
    end

    test "returns {:ok, empty list} when the user has no cluster access" do
      user = insert(:user)
      insert(:cluster)

      assert {:ok, parsed} = Tool.validate(%ClusterList{user: user}, %{})
      assert {:ok, json} = ClusterList.implement(parsed)
      assert {:ok, []} = Jason.decode(json)
    end

    test "filters results by project name" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      other_project = insert(:project, read_bindings: [%{user_id: user.id}])
      allowed_cluster = insert(:cluster, project: project, read_bindings: [%{user_id: user.id}])
      _other_cluster = insert(:cluster, project: other_project, read_bindings: [%{user_id: user.id}])

      assert {:ok, parsed} = Tool.validate(%ClusterList{user: user}, %{"project" => project.name})
      assert {:ok, json} = ClusterList.implement(parsed)
      assert {:ok, list} = Jason.decode(json)
      assert Enum.any?(list, &(&1["id"] == allowed_cluster.id))
      refute Enum.any?(list, &(&1["project"]["name"] == other_project.name))
    end
  end

  describe "ClusterTags (plrl_cluster_tags)" do
    test "returns {:ok, json} listing cluster tags" do
      cluster = insert(:cluster)
      tag = insert(:tag, cluster: cluster, name: "team", value: "platform")

      assert {:ok, parsed} = Tool.validate(%ClusterTags{}, %{})
      assert {:ok, json} = ClusterTags.implement(parsed)
      assert {:ok, list} = Jason.decode(json)
      assert Enum.any?(list, &(&1["name"] == tag.name and &1["value"] == tag.value))
    end

    test "filters tags by tag name" do
      cluster = insert(:cluster)
      _tag1 = insert(:tag, cluster: cluster, name: "team", value: "platform")
      tag2 = insert(:tag, cluster: cluster, name: "env", value: "prod")

      assert {:ok, parsed} = Tool.validate(%ClusterTags{}, %{"tag" => "env"})
      assert {:ok, json} = ClusterTags.implement(parsed)
      assert {:ok, list} = Jason.decode(json)
      assert Enum.all?(list, &(&1["name"] == "env"))
      assert Enum.any?(list, &(&1["name"] == tag2.name and &1["value"] == tag2.value))
    end
  end

  describe "Projects (plrl_projects)" do
    test "returns {:ok, json} including projects the user can read" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])

      assert {:ok, parsed} = Tool.validate(%Projects{user: user}, %{})
      assert {:ok, json} = Projects.implement(parsed)
      assert {:ok, list} = Jason.decode(json)
      assert Enum.any?(list, &(&1["id"] == project.id))
    end

    test "filters projects by q search" do
      user = insert(:user)
      project = insert(:project, name: "alpha-observability", read_bindings: [%{user_id: user.id}])
      _other = insert(:project, name: "beta-platform", read_bindings: [%{user_id: user.id}])

      assert {:ok, parsed} = Tool.validate(%Projects{user: user}, %{"q" => "alpha"})
      assert {:ok, json} = Projects.implement(parsed)
      assert {:ok, list} = Jason.decode(json)
      assert Enum.any?(list, &(&1["id"] == project.id))
      assert Enum.all?(list, &(String.contains?(&1["name"], "alpha")))
    end
  end

  describe "Cluster (plrl_cluster)" do
    test "returns {:ok, _} when the user can read the cluster" do
      user = insert(:user)
      cluster = insert(:cluster, read_bindings: [%{user_id: user.id}])

      assert {:ok, parsed} = Tool.validate(%Cluster{user: user}, %{"handle" => cluster.handle})
      assert {:ok, content} = Cluster.implement(parsed)
      assert is_binary(content)

      assert {:ok, parsed_id} = Tool.validate(%Cluster{user: user}, %{"cluster_id" => cluster.id})
      assert {:ok, content_id} = Cluster.implement(parsed_id)
      assert is_binary(content_id)
    end

    test "returns {:error, _} when the user cannot read the cluster" do
      owner = insert(:user)
      other = insert(:user)
      cluster = insert(:cluster, read_bindings: [%{user_id: owner.id}])

      assert {:ok, parsed} = Tool.validate(%Cluster{user: other}, %{"handle" => cluster.handle})
      assert {:error, _} = Cluster.implement(parsed)
    end
  end

  describe "ClusterServices (plrl_cluster_services)" do
    test "returns {:ok, json} listing services when the user can read the cluster" do
      user = insert(:user)
      cluster = insert(:cluster, read_bindings: [%{user_id: user.id}])
      service = insert(:service, cluster: cluster)

      assert {:ok, parsed} = Tool.validate(%ClusterServices{user: user}, %{"cluster" => cluster.handle})
      assert {:ok, json} = ClusterServices.implement(parsed)
      assert {:ok, list} = Jason.decode(json)
      assert Enum.any?(list, &(&1["id"] == service.id))
    end

    test "returns {:error, _} when the user cannot read the cluster" do
      owner = insert(:user)
      other = insert(:user)
      cluster = insert(:cluster, read_bindings: [%{user_id: owner.id}])
      insert(:service, cluster: cluster)

      assert {:ok, parsed} = Tool.validate(%ClusterServices{user: other}, %{"cluster" => cluster.handle})
      assert {:error, _} = ClusterServices.implement(parsed)
    end
  end

  describe "ServiceInspect (plrl_service)" do
    test "returns {:ok, _} when the user can read the service" do
      user = insert(:user)
      cluster = insert(:cluster, read_bindings: [%{user_id: user.id}])
      service = insert(:service, cluster: cluster)

      assert {:ok, parsed} =
               Tool.validate(%ServiceInspect{user: user}, %{"service_id" => service.id})

      assert {:ok, content} = ServiceInspect.implement(parsed)
      assert is_binary(content)
    end

    test "returns {:error, _} when the user cannot read the service" do
      owner = insert(:user)
      other = insert(:user)
      cluster = insert(:cluster, read_bindings: [%{user_id: owner.id}])
      service = insert(:service, cluster: cluster)

      assert {:ok, parsed} =
               Tool.validate(%ServiceInspect{user: other}, %{"service_id" => service.id})

      assert {:error, _} = ServiceInspect.implement(parsed)
    end

    test "when vuln_reports is true, includes simplified vulnerability reports in the response" do
      user = insert(:user)
      cluster = insert(:cluster, read_bindings: [%{user_id: user.id}])
      service = insert(:service, cluster: cluster)

      report =
        insert(:vulnerability_report,
          cluster: cluster,
          artifact_url: "docker.io/app:v1",
          summary: %VulnerabilityReport.Summary{
            critical_count: 1,
            high_count: 0,
            medium_count: 0,
            low_count: 0,
            unknown_count: 0,
            none_count: 0
          }
        )

      insert(:service_vuln, service: service, report: report)

      assert {:ok, parsed} =
               Tool.validate(%ServiceInspect{user: user}, %{
                 "service_id" => service.id,
                 "vuln_reports" => true
               })

      assert {:ok, content} = ServiceInspect.implement(parsed)
      assert content =~ "# Vulnerability Reports"
      assert content =~ "docker.io/app:v1"
      assert content =~ "\"critical_count\":1"
      assert content =~ report.id
    end
  end

  describe "StackList (plrl_stacks)" do
    test "returns {:ok, json} including stacks the user can read" do
      user = insert(:user)
      stack = insert(:stack, read_bindings: [%{user_id: user.id}])

      assert {:ok, parsed} = Tool.validate(%StackList{user: user}, %{})
      assert {:ok, json} = StackList.implement(parsed)
      assert {:ok, list} = Jason.decode(json)
      assert Enum.any?(list, &(&1["id"] == stack.id))
    end

    test "returns {:ok, empty list} when the user has no stack access" do
      user = insert(:user)
      insert(:stack)

      assert {:ok, parsed} = Tool.validate(%StackList{user: user}, %{})
      assert {:ok, json} = StackList.implement(parsed)
      assert {:ok, []} = Jason.decode(json)
    end
  end

  describe "StackInspect (plrl_stack)" do
    test "returns {:ok, _} when the user can read the stack" do
      user = insert(:user)
      stack = insert(:stack, read_bindings: [%{user_id: user.id}])

      assert {:ok, parsed} = Tool.validate(%StackInspect{user: user}, %{"stack_id" => stack.id})
      assert {:ok, content} = StackInspect.implement(parsed)
      assert is_binary(content)
    end

    test "returns {:error, _} when the user cannot read the stack" do
      owner = insert(:user)
      other = insert(:user)
      stack = insert(:stack, read_bindings: [%{user_id: owner.id}])

      assert {:ok, parsed} = Tool.validate(%StackInspect{user: other}, %{"stack_id" => stack.id})
      assert {:error, _} = StackInspect.implement(parsed)
    end

    test "when status is failed, includes latest failed run and failing step logs" do
      user = insert(:user)
      stack = insert(:stack, status: :failed, read_bindings: [%{user_id: user.id}])

      run =
        insert(:stack_run,
          stack: stack,
          cluster: stack.cluster,
          repository: stack.repository,
          status: :failed,
          message: "apply failed",
          git: stack.git
        )

      step =
        insert(:run_step,
          run: run,
          status: :failed,
          stage: :apply,
          cmd: "terraform",
          args: ["apply"],
          index: 1
        )

      insert(:run_log, step: step, logs: "Error: something broke")

      assert {:ok, parsed} = Tool.validate(%StackInspect{user: user}, %{"stack_id" => stack.id})
      assert {:ok, content} = StackInspect.implement(parsed)

      assert content =~ "Latest failed run"
      assert content =~ run.id
      assert content =~ "terraform"
      assert content =~ "Error: something broke"
    end
  end

  describe "VulnReports (plrl_vuln_reports)" do
    test "returns {:ok, json} listing reports linked to the service when the user can read the service" do
      user = insert(:user)
      cluster = insert(:cluster, read_bindings: [%{user_id: user.id}])
      service = insert(:service, cluster: cluster)

      report =
        insert(:vulnerability_report,
          cluster: cluster,
          artifact_url: "docker.io/app:v1",
          summary: %VulnerabilityReport.Summary{
            critical_count: 1,
            high_count: 0,
            medium_count: 0,
            low_count: 0,
            unknown_count: 0,
            none_count: 0
          }
        )

      insert(:service_vuln, service: service, report: report)

      assert {:ok, parsed} =
               Tool.validate(%VulnReports{user: user}, %{"service_id" => service.id})

      assert {:ok, json} = VulnReports.implement(parsed)
      assert {:ok, list} = Jason.decode(json)
      assert length(list) == 1
      row = hd(list)
      assert row["id"] == report.id
      assert row["artifact_url"] == report.artifact_url
      assert row["critical_count"] == 1
    end

    test "returns {:ok, empty list} when the service has no reports and the user can read the service" do
      user = insert(:user)
      cluster = insert(:cluster, read_bindings: [%{user_id: user.id}])
      service = insert(:service, cluster: cluster)

      assert {:ok, parsed} =
               Tool.validate(%VulnReports{user: user}, %{"service_id" => service.id})

      assert {:ok, json} = VulnReports.implement(parsed)
      assert {:ok, []} = Jason.decode(json)
    end

    test "returns {:error, _} when the user cannot read the service" do
      owner = insert(:user)
      other = insert(:user)
      cluster = insert(:cluster, read_bindings: [%{user_id: owner.id}])
      service = insert(:service, cluster: cluster)

      assert {:ok, parsed} =
               Tool.validate(%VulnReports{user: other}, %{"service_id" => service.id})

      assert {:error, _} = VulnReports.implement(parsed)
    end

    test "returns {:error, _} when the service id does not exist" do
      user = insert(:user)

      assert {:ok, parsed} =
               Tool.validate(%VulnReports{user: user}, %{"service_id" => Ecto.UUID.generate()})

      assert {:error, _} = VulnReports.implement(parsed)
    end

    test "returns {:error, _} when service_id is not a valid UUID" do
      assert {:error, cs} = Tool.validate(%VulnReports{}, %{"service_id" => "not-a-uuid"})
      assert Keyword.has_key?(cs.errors, :service_id)
    end
  end

  describe "Vulns (plrl_vulns)" do
    test "returns {:ok, json} listing vulnerabilities for the report when the user can read the report" do
      user = insert(:user)
      cluster = insert(:cluster, read_bindings: [%{user_id: user.id}])

      report =
        insert(:vulnerability_report,
          cluster: cluster,
          summary: %VulnerabilityReport.Summary{
            critical_count: 0,
            high_count: 0,
            medium_count: 0,
            low_count: 0,
            unknown_count: 0,
            none_count: 0
          }
        )

      insert(:vulnerability,
        report: report,
        title: "CVE-2024-1234",
        severity: :high,
        score: 7.5,
        primary_link: "https://example.test/cve"
      )

      assert {:ok, parsed} =
               Tool.validate(%Vulns{user: user}, %{"report_id" => report.id})

      assert {:ok, json} = Vulns.implement(parsed)
      assert {:ok, list} = Jason.decode(json)
      assert length(list) == 1
      row = hd(list)
      assert row["title"] == "CVE-2024-1234"
      assert row["severity"] == "high"
      assert row["score"] == 7.5
      assert row["primary_link"] == "https://example.test/cve"
    end

    test "returns {:ok, empty list} when the report has no vulnerabilities and the user can read the report" do
      user = insert(:user)
      cluster = insert(:cluster, read_bindings: [%{user_id: user.id}])

      report =
        insert(:vulnerability_report,
          cluster: cluster,
          summary: %VulnerabilityReport.Summary{
            critical_count: 0,
            high_count: 0,
            medium_count: 0,
            low_count: 0,
            unknown_count: 0,
            none_count: 0
          }
        )

      assert {:ok, parsed} =
               Tool.validate(%Vulns{user: user}, %{"report_id" => report.id})

      assert {:ok, json} = Vulns.implement(parsed)
      assert {:ok, []} = Jason.decode(json)
    end

    test "returns {:error, _} when the user cannot read the vulnerability report" do
      owner = insert(:user)
      other = insert(:user)
      cluster = insert(:cluster, read_bindings: [%{user_id: owner.id}])

      report =
        insert(:vulnerability_report,
          cluster: cluster,
          summary: %VulnerabilityReport.Summary{
            critical_count: 0,
            high_count: 0,
            medium_count: 0,
            low_count: 0,
            unknown_count: 0,
            none_count: 0
          }
        )

      assert {:ok, parsed} =
               Tool.validate(%Vulns{user: other}, %{"report_id" => report.id})

      assert {:error, _} = Vulns.implement(parsed)
    end

    test "returns {:error, _} when the report id does not exist" do
      user = insert(:user)

      assert {:ok, parsed} =
               Tool.validate(%Vulns{user: user}, %{"report_id" => Ecto.UUID.generate()})

      assert {:error, _} = Vulns.implement(parsed)
    end

    test "returns {:error, _} when report_id is not a valid UUID" do
      assert {:error, cs} = Tool.validate(%Vulns{}, %{"report_id" => "bad"})
      assert Keyword.has_key?(cs.errors, :report_id)
    end
  end
end
