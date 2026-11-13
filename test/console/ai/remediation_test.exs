defmodule Console.AI.RemediationTest do
  use Console.DataCase, async: true
  alias Console.AI.Remediation
  alias Console.Schema.{ClusterInsightComponent, WorkbenchJob}

  describe "#remediate/1" do
    test "starts a job that includes same-namespace services" do
      {cluster, workbench, bot} = remediation_cluster()
      comp = component(cluster, name: "serving-cert", namespace: "cert-manager", sha: "cert-sha")
      svc = insert(:service, cluster: cluster, namespace: "cert-manager", name: "cert-manager")

      {:ok, [job]} = Remediation.remediate(cluster)

      assert job.workbench_id == workbench.id
      assert job.user_id == bot.id
      assert job.cluster_id == cluster.id
      assert job.component_key == ClusterInsightComponent.key(comp)
      assert job.insight_sha == "cert-sha"
      assert job.status == :pending
      assert job.prompt =~ "serving-cert"
      assert job.prompt =~ "cert-manager.io/v1"
      assert job.prompt =~ svc.name
    end

    test "skips components below the priority floor" do
      {cluster, _, _} = remediation_cluster(min_priority: :high)
      component(cluster, priority: :medium)

      assert Remediation.remediate(cluster) == :ok
      assert job_count(cluster) == 0
    end

    test "skips components without insight text" do
      {cluster, _, _} = remediation_cluster()
      component(cluster, text: nil)

      assert Remediation.remediate(cluster) == :ok
      assert job_count(cluster) == 0
    end

    test "does nothing when auto-remediation is off" do
      cluster = insert(:cluster)
      component(cluster, priority: :critical)

      assert Remediation.remediate(cluster) == :ok
      assert job_count(cluster) == 0
    end

    test "suppresses a repeat of the same insight sha inside the window" do
      {cluster, workbench, bot} = remediation_cluster()
      comp = component(cluster, sha: "same-sha")
      insert(:workbench_job,
        workbench: workbench,
        user: bot,
        cluster: cluster,
        component_key: ClusterInsightComponent.key(comp),
        insight_sha: "same-sha",
        status: :successful
      )

      assert Remediation.remediate(cluster) == :ok
      assert job_count(cluster) == 1
    end

    test "starts again once the same insight sha is outside the window" do
      {cluster, workbench, bot} = remediation_cluster(window: 3600)
      comp = component(cluster, sha: "same-sha")
      job = insert(:workbench_job,
        workbench: workbench,
        user: bot,
        cluster: cluster,
        component_key: ClusterInsightComponent.key(comp),
        insight_sha: "same-sha",
        status: :successful
      )

      job
      |> Ecto.Changeset.change(inserted_at: DateTime.add(DateTime.utc_now(), -7200, :second))
      |> Console.Repo.update!()

      {:ok, [created]} = Remediation.remediate(cluster)

      assert created.id != job.id
      assert job_count(cluster) == 2
    end

    test "suppresses a component that already has an active job" do
      {cluster, workbench, bot} = remediation_cluster()
      comp = component(cluster, sha: "new-sha")
      insert(:workbench_job,
        workbench: workbench,
        user: bot,
        cluster: cluster,
        component_key: ClusterInsightComponent.key(comp),
        insight_sha: "old-sha",
        status: :running
      )

      assert Remediation.remediate(cluster) == :ok
      assert job_count(cluster) == 1
    end

    test "stops at the cluster job cap" do
      {cluster, _, _} = remediation_cluster(max_jobs: 1)
      component(cluster, name: "first", sha: "sha-1")
      component(cluster, name: "second", sha: "sha-2")

      {:ok, jobs} = Remediation.remediate(cluster)

      assert length(jobs) == 1
      assert job_count(cluster) == 1
    end

    test "returns an error when the workbench has no bot user" do
      workbench = insert(:workbench, bot_user: nil)
      cluster = insert(:cluster, remediation_workbench: workbench)
      component(cluster, priority: :critical)

      assert {:error, "workbench does not have a bot user"} = Remediation.remediate(cluster)
    end
  end

  defp remediation_cluster(opts \\ []) do
    bot = insert(:user, roles: %{admin: true})
    workbench = insert(:workbench, bot_user: bot)
    cluster = insert(:cluster,
      remediation_workbench: workbench,
      remediation_min_priority: Keyword.get(opts, :min_priority, :high),
      remediation_window: Keyword.get(opts, :window, 21_600),
      remediation_max_jobs: Keyword.get(opts, :max_jobs, 3)
    )

    {cluster, workbench, bot}
  end

  defp component(cluster, attrs) do
    insight = insert(:ai_insight,
      text: Keyword.get(attrs, :text, "Certificate is not ready"),
      sha: Keyword.get(attrs, :sha, "sha")
    )

    insert(:cluster_insight_component,
      cluster: cluster,
      priority: Keyword.get(attrs, :priority, :critical),
      namespace: Keyword.get(attrs, :namespace, "cert-manager"),
      name: Keyword.get(attrs, :name, "serving-cert"),
      kind: Keyword.get(attrs, :kind, "Certificate"),
      group: "cert-manager.io",
      version: "v1",
      insight: insight
    )
  end

  defp job_count(cluster) do
    WorkbenchJob.for_cluster(cluster.id)
    |> Console.Repo.aggregate(:count, :id)
  end
end
