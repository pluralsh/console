defmodule Console.Deployments.PipelinesTest do
  use Console.DataCase, async: true
  alias Console.PubSub
  alias Console.Deployments.{Pipelines, Services}

  describe "#upsert/3" do
    test "it can create a new pipeline w/ stages and gates" do
      user = admin_user()
      [svc, svc2] = insert_list(2, :service)
      {:ok, pipeline} = Pipelines.upsert(%{
        stages: [
          %{name: "dev", services: [%{name: svc.name, handle: svc.cluster.handle}]},
          %{name: "prod", services: [
            %{name: svc2.name, handle: svc2.cluster.handle, criteria: %{
                name: svc.name,
                handle: svc.cluster.handle,
                secrets: ["test-secret"]
            }},
          ]}
        ],
        edges: [
          %{
            from: "dev",
            to: "prod",
            gates: [
              %{type: :approval, name: "approve"},
              %{type: :job, name: "integration", spec: %{
                job: %{
                  namespace: "namespace",
                  containers: [%{image: "my-test:latest"}]
                }
              }}
            ]}
        ]
      }, "my-pipeline", user)

      assert pipeline.name == "my-pipeline"
      [dev, prod] = pipeline.stages

      assert dev.name == "dev"
      [stage_service] = dev.services
      assert stage_service.service_id == svc.id

      assert prod.name == "prod"
      [prod_svc] = prod.services
      assert prod_svc.service_id == svc2.id
      assert prod_svc.criteria.source_id == svc.id
      assert prod_svc.criteria.secrets == ["test-secret"]

      [edge] = pipeline.edges
      assert edge.from_id == dev.id
      assert edge.to_id == prod.id

      [gate, job_gate] = edge.gates
      assert gate.name == "approve"
      assert gate.type == :approval
      assert gate.edge_id == edge.id

      assert job_gate.name == "integration"
      assert job_gate.type == :job
      assert job_gate.edge_id == edge.id
      assert job_gate.spec.job.namespace == "namespace"
      [container] = job_gate.spec.job.containers
      assert container.image == "my-test:latest"

      assert_receive {:event, %PubSub.PipelineUpserted{item: ^pipeline}}
    end

    test "it can update a pipeline with stages" do
      user = admin_user()
      [svc, svc2] = insert_list(2, :service)
      pipe = insert(:pipeline, name: "my-pipeline")
      dev = insert(:pipeline_stage, pipeline: pipe, name: "dev")
      ss1 = insert(:stage_service, service: svc, stage: dev)
      prod = insert(:pipeline_stage, pipeline: pipe, name: "prod")
      ss2 = insert(:stage_service, service: svc2, stage: prod)
      insert(:promotion_criteria, stage_service: ss2, source: svc, secrets: ["some-secret"])
      edge = insert(:pipeline_edge, from: dev, to: prod, pipeline: pipe)
      gate = insert(:pipeline_gate, edge: edge, type: :approval, name: "approve")

      {:ok, pipeline} = Pipelines.upsert(%{
        stages: [
          %{name: "dev", services: [%{name: svc.name, handle: svc.cluster.handle}]},
          %{name: "prod", services: [
            %{name: svc2.name, handle: svc2.cluster.handle, criteria: %{
              name: svc.name,
              handle: svc.cluster.handle,
              secrets: ["test-secret"]
            }},
          ]}
        ],
        edges: [
          %{from: "dev", to: "prod", gates: [%{type: :approval, name: "approve"}]}
        ]
      }, "my-pipeline", user)

      [d, p] = pipeline.stages

      assert d.id == dev.id
      [stage_service] = d.services
      assert stage_service.id == ss1.id
      assert stage_service.service_id == svc.id

      assert p.id == prod.id
      [stage_service] = p.services
      assert stage_service.id == ss2.id
      assert stage_service.service_id == svc2.id
      assert stage_service.criteria.source_id == svc.id
      assert stage_service.criteria.secrets == ["test-secret"]

      [e] = pipeline.edges
      assert e.id == edge.id
      assert e.from_id == dev.id
      assert e.to_id == prod.id

      [g] = e.gates
      assert g.id == gate.id
      assert g.name == "approve"
      assert g.type == :approval

      assert_receive {:event, %PubSub.PipelineUpserted{item: ^pipeline}}
    end

    test "it will respect rbac" do
      user = insert(:user)
      [svc, svc2] = insert_list(2, :service)
      pipe = insert(:pipeline, name: "my-pipeline", write_bindings: [%{user_id: user.id}])
      dev = insert(:pipeline_stage, pipeline: pipe, name: "dev")
      insert(:stage_service, service: svc, stage: dev)
      prod = insert(:pipeline_stage, pipeline: pipe, name: "prod")
      ss2 = insert(:stage_service, service: svc2, stage: prod)
      insert(:promotion_criteria, stage_service: ss2, source: svc, secrets: ["some-secret"])
      insert(:pipeline_edge, from: dev, to: prod, pipeline: pipe)

      {:ok, _} = Pipelines.upsert(%{
        stages: [
          %{name: "dev", services: [%{name: svc.name, handle: svc.cluster.handle}]},
          %{name: "prod", services: [
            %{name: svc2.name, handle: svc2.cluster.handle, criteria: %{
                name: svc.name,
                handle: svc.cluster.handle,
                secrets: ["test-secret"]
            }},
          ]}
        ],
        edges: [%{from: "dev", to: "prod"}]
      }, "my-pipeline", user)

      {:error, _} = Pipelines.upsert(%{
        stages: [
          %{name: "dev", services: [%{name: svc.name, handle: svc.cluster.handle}]},
          %{name: "prod", services: [
            %{name: svc2.name, handle: svc2.cluster.handle, criteria: %{
                name: svc.name,
                handle: svc.cluster.handle,
                secrets: ["test-secret"]
            }},
          ]}
        ],
        edges: [%{from: "dev", to: "prod"}]
      }, "my-pipeline", insert(:user))


      [svc, svc2] = insert_list(2, :service)
      user = insert(:user)
      {:error, _} = Pipelines.upsert(%{
        write_bindings: [%{user_id: user.id}],
        stages: [
          %{name: "dev", services: [%{name: svc.name, handle: svc.cluster.handle}]},
          %{name: "prod", services: [
            %{name: svc2.name, handle: svc2.cluster.handle, criteria: %{
                name: svc.name,
                handle: svc.cluster.handle,
                secrets: ["test-secret"]
            }},
          ]}
        ],
        edges: [%{from: "dev", to: "prod"}]
      }, "new-pipeline", user)
    end
  end

  describe "#delete/2" do
    test "it can delete a pipeline by id" do
      admin = admin_user()
      pipe = insert(:pipeline)

      {:ok, del} = Pipelines.delete(pipe.id, admin)

      assert del.id == pipe.id
      refute refetch(pipe)
    end
  end

  describe "#build_promotion/1" do
    test "it will create a new promotion for a pipeline stage and mark all gates pending" do
      admin = admin_user()
      git = insert(:git_repository)
      {:ok, svc} = create_service(%{
        name: "my-service",
        namespace: "my-service",
        repository_id: git.id,
        status: :healthy,
        git: %{ref: "main", folder: "k8s"},
        configuration: [%{name: "name", value: "value"}]
      }, insert(:cluster), admin)

      stage = insert(:pipeline_stage)
      prod = insert(:pipeline_stage)
      insert(:pipeline_edge, from: stage)
      insert(:stage_service, stage: stage, service: svc)
      edge = insert(:pipeline_edge, from: stage, to: prod)
      gate = insert(:pipeline_gate, edge: edge, state: :open)

      {:ok, promo} = Pipelines.build_promotion(stage)

      assert promo.stage_id == stage.id
      assert promo.revised_at
      [service] = promo.services
      assert service.service_id == svc.id
      assert service.revision_id == svc.revision_id

      assert refetch(gate).state == :pending
    end

    test "it will revise a promotion if there is a change" do
      admin = admin_user()
      git = insert(:git_repository)
      {:ok, svc} = create_service(%{
        name: "my-service",
        namespace: "my-service",
        repository_id: git.id,
        status: :healthy,
        git: %{ref: "main", folder: "k8s"},
        configuration: [%{name: "name", value: "value"}]
      }, insert(:cluster), admin)

      stage = insert(:pipeline_stage)
      insert(:pipeline_edge, from: stage)
      insert(:stage_service, stage: stage, service: svc)
      promotion = insert(:pipeline_promotion, stage: stage, revised_at: Timex.now()  |> Timex.shift(minutes: -1))
      insert(:promotion_service, promotion: promotion, service: svc, revision: build(:revision))
      other = insert(:promotion_service, promotion: promotion)

      {:ok, promo} = Pipelines.build_promotion(stage)

      assert promo.id == promotion.id
      assert promo.stage_id == stage.id
      refute promo.revised_at == promotion.revised_at
      service = Enum.find(promo.services, & &1.service_id == svc.id)
      assert service.revision_id == svc.revision_id

      assert Enum.find(promo.services, & &1.id == other.id).revision_id == other.revision_id

      assert_receive {:event, %PubSub.PromotionCreated{item: ^promo}}
    end

    test "it will revise a promotion if there is a sha change" do
      admin = admin_user()
      git = insert(:git_repository)
      {:ok, svc} = create_service(%{
        name: "my-service",
        namespace: "my-service",
        repository_id: git.id,
        status: :healthy,
        git: %{ref: "main", folder: "k8s"},
        configuration: [%{name: "name", value: "value"}]
      }, insert(:cluster), admin)

      svc = Console.Repo.preload(svc, [:revision])
      stage = insert(:pipeline_stage)
      insert(:pipeline_edge, from: stage)
      insert(:stage_service, stage: stage, service: svc)
      promotion = insert(:pipeline_promotion, stage: stage, revised_at: Timex.now()  |> Timex.shift(minutes: -1))
      insert(:promotion_service, promotion: promotion, service: svc, revision: svc.revision, sha: "old")

      {:ok, promo} = Pipelines.build_promotion(stage)

      assert promo.id == promotion.id
      assert promo.stage_id == stage.id
      refute promo.revised_at == promotion.revised_at
      assert promo.revised
      service = Enum.find(promo.services, & &1.service_id == svc.id)
      assert service.revision_id == svc.revision_id

      assert_receive {:event, %PubSub.PromotionCreated{item: ^promo}}
    end

    test "it will ignore if the stage has no successors" do
      admin = admin_user()
      git = insert(:git_repository)
      {:ok, svc} = create_service(%{
        name: "my-service",
        namespace: "my-service",
        repository_id: git.id,
        status: :healthy,
        git: %{ref: "main", folder: "k8s"},
        configuration: [%{name: "name", value: "value"}]
      }, insert(:cluster), admin)

      stage = insert(:pipeline_stage)
      insert(:stage_service, stage: stage, service: svc)

      {:error, _} = Pipelines.build_promotion(stage)
    end

    test "it will not revise a promotion if the service is not healthy" do
      stage = insert(:pipeline_stage)
      insert(:pipeline_edge, from: stage)
      svc = insert(:service, sha: "test-sha", status: :stale)
      insert(:revision, service: svc, sha: "test-sha")
      insert(:stage_service, stage: stage, service: svc)
      promotion = insert(:pipeline_promotion,
        stage: stage,
        revised_at: Timex.now()  |> Timex.shift(minutes: -1),
        promoted_at: Timex.now() |> Timex.shift(minutes: -2)
      )
      insert(:promotion_service, promotion: promotion, service: svc, revision: build(:revision))
      insert(:promotion_service, promotion: promotion)

      {:ok, promo} = Pipelines.build_promotion(stage)

      assert promo.id == promotion.id
      assert promo.stage_id == stage.id
      assert promo.revised_at == promotion.revised_at
      refute promo.revised
    end

    test "it won't revise a promotion if there are no changes" do
      stage = insert(:pipeline_stage)
      insert(:pipeline_edge, from: stage)
      svc = insert(:service, sha: "test-sha", status: :healthy)
      rev = insert(:revision, service: svc, sha: "test-sha")
      insert(:stage_service, stage: stage, service: svc)
      promotion = insert(:pipeline_promotion, stage: stage, promoted_at: Timex.now(), revised_at: Timex.now() |> Timex.shift(minutes: -1))
      insert(:promotion_service, promotion: promotion, service: svc, revision: rev)

      stage2 = insert(:pipeline_stage, pipeline: stage.pipeline)
      edge = insert(:pipeline_edge, from: stage, to: stage2)
      gate = insert(:pipeline_gate, edge: edge, state: :open)

      {:ok, promo} = Pipelines.build_promotion(stage)

      assert promo.id == promotion.id
      assert promo.stage_id == stage.id
      assert promo.revised_at == promotion.revised_at
      refute promo.revised

      assert refetch(gate).state == :open
    end
  end

  describe "#approve_gate/2" do
    test "approvals respect rbac" do
      user = insert(:user)
      pipeline = insert(:pipeline, write_bindings: [%{user_id: user.id}])
      gate = insert(:pipeline_gate, edge: build(:pipeline_edge, pipeline: pipeline))

      {:ok, approved} = Pipelines.approve_gate(gate.id, user)

      assert approved.id == gate.id
      assert approved.state == :open
      assert approved.approver_id == user.id

      assert_receive {:event, %PubSub.PipelineGateApproved{item: ^approved}}

      {:error, _} = Pipelines.approve_gate(gate.id, insert(:user))
    end

    test "you cannot approve non-approval gates" do
      user = insert(:user)
      pipeline = insert(:pipeline, write_bindings: [%{user_id: user.id}])
      gate = insert(:pipeline_gate, type: :window, edge: build(:pipeline_edge, pipeline: pipeline))

      {:error, _} = Pipelines.approve_gate(gate.id, user)
    end
  end

  describe "#force_gate/2" do
    test "approvals respect rbac" do
      user = insert(:user)
      pipeline = insert(:pipeline, write_bindings: [%{user_id: user.id}])
      gate = insert(:pipeline_gate, edge: build(:pipeline_edge, pipeline: pipeline))

      {:ok, approved} = Pipelines.force_gate(gate.id, user)

      assert approved.id == gate.id
      assert approved.state == :open
      refute approved.approver_id

      assert_receive {:event, %PubSub.PipelineGateApproved{item: ^approved}}

      {:error, _} = Pipelines.force_gate(gate.id, insert(:user))
    end
  end

  describe "#for_cluster/1" do
    test "it will fetch eligible gates for a cluster" do
      cluster = insert(:cluster)
      other   = insert(:cluster)
      job = insert(:pipeline_gate, type: :job, state: :pending, cluster: cluster)
      insert(:pipeline_gate, type: :job, state: :pending, cluster: other)
      insert(:pipeline_gate, type: :job, state: :open, cluster: cluster)
      insert(:pipeline_gate, type: :job, state: :closed, cluster: cluster)
      insert(:pipeline_gate, type: :approval)

      [found] = Pipelines.for_cluster(cluster)

      assert found.id == job.id
    end
  end

  describe "#update_gate/3" do
    test "a deployment agent can update a cluster gate" do
      cluster = insert(:cluster)
      job = insert(:pipeline_gate, type: :job, state: :pending, cluster: cluster)

      {:ok, updated} = Pipelines.update_gate(%{state: :open}, job.id, cluster)

      assert updated.id == job.id
      assert updated.cluster_id == cluster.id
      assert updated.state == :open
    end

    test "agents cannot update gates for other clusters" do
      cluster = insert(:cluster)
      job = insert(:pipeline_gate, type: :job, state: :pending, cluster: cluster)

      {:error, _} = Pipelines.update_gate(%{state: :open}, job.id, insert(:cluster))
    end
  end

  describe "#apply_promotion" do
    test "it can apply a promotion to all adjacent pipeline stages" do
      admin = admin_user()
      cluster = insert(:cluster)
      repository = insert(:git_repository)

      pipe = insert(:pipeline)
      dev = insert(:pipeline_stage, pipeline: pipe)
      prod = insert(:pipeline_stage, pipeline: pipe)
      edge = insert(:pipeline_edge, pipeline: pipe, from: dev, to: prod)

      {:ok, dev_svc} = create_service(cluster, admin, [
        name: "dev",
        namespace: "test",
        git: %{ref: "master", folder: "k8s"},
        sha: "test-sha",
        repository_id: repository.id,
        configuration: [%{name: "name", value: "new-value"}]
      ])
      dev_svc = Console.Repo.preload(dev_svc, [:revision])

      {:ok, prod_svc} = create_service(cluster, admin, [
        name: "prod",
        namespace: "test",
        git: %{ref: "master", folder: "k8s"},
        repository_id: repository.id,
        configuration: [%{name: "name", value: "value"}, %{name: "other", value: "other-value"}]
      ])

      insert(:stage_service, stage: dev, service: dev_svc)
      ss = insert(:stage_service, stage: prod, service: prod_svc)
      insert(:promotion_criteria, stage_service: ss, source: dev_svc, secrets: ["name"])
      promo = insert(:pipeline_promotion, stage: dev, revised_at: Timex.now())
      insert(:promotion_service, promotion: promo, service: dev_svc, revision: dev_svc.revision)

      {:ok, promod} = Pipelines.apply_promotion(promo)

      assert promod.id == promo.id
      assert promod.promoted_at
      assert refetch(edge).promoted_at

      prod_svc = refetch(prod_svc)

      assert prod_svc.git.ref == "test-sha"
      assert prod_svc.git.folder == "k8s"
      {:ok, secrets} = Services.configuration(prod_svc)
      assert secrets["name"] == "new-value"
      assert secrets["other"] == "other-value"
    end

    test "it will block promotion if a gate is not open" do
      admin = admin_user()
      cluster = insert(:cluster)
      repository = insert(:git_repository)

      pipe = insert(:pipeline)
      dev = insert(:pipeline_stage, pipeline: pipe)
      prod = insert(:pipeline_stage, pipeline: pipe)
      edge = insert(:pipeline_edge, pipeline: pipe, from: dev, to: prod)
      gate = insert(:pipeline_gate, edge: edge, type: :approval, state: :pending)

      {:ok, dev_svc} = create_service(cluster, admin, [
        name: "dev",
        namespace: "test",
        git: %{ref: "master", folder: "k8s"},
        sha: "test-sha",
        repository_id: repository.id,
        configuration: [%{name: "name", value: "new-value"}]
      ])
      dev_svc = Console.Repo.preload(dev_svc, [:revision])

      {:ok, prod_svc} = create_service(cluster, admin, [
        name: "prod",
        namespace: "test",
        git: %{ref: "master", folder: "k8s"},
        repository_id: repository.id,
        configuration: [%{name: "name", value: "value"}]
      ])

      insert(:stage_service, stage: dev, service: dev_svc)
      ss = insert(:stage_service, stage: prod, service: prod_svc)
      insert(:promotion_criteria, stage_service: ss, source: dev_svc, secrets: ["name"])
      promo = insert(:pipeline_promotion, stage: dev, revised_at: Timex.now())
      insert(:promotion_service, promotion: promo, service: dev_svc, revision: dev_svc.revision)

      {:ok, promod} = Pipelines.apply_promotion(promo)

      assert promod.id == promo.id
      refute promod.promoted_at

      {:ok, _} = Pipelines.approve_gate(gate.id, admin)

      {:ok, promod} = Pipelines.apply_promotion(promo)

      assert promod.id == promo.id
      assert promod.promoted_at
    end
  end
end
