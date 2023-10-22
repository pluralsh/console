defmodule Console.Deployments.PipelinesTest do
  use Console.DataCase, async: true
  alias Console.PubSub
  alias Console.Deployments.{Pipelines, Services}

  describe "#upsert/3" do
    test "it can create a new pipeline w/ stages" do
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
        edges: [%{from: "dev", to: "prod"}]
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
        edges: [%{from: "dev", to: "prod"}]
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

  describe "#build_promotion/1" do
    test "it will create a new promotion for a pipeline stage" do
      stage = insert(:pipeline_stage)
      svc = insert(:service, sha: "test-sha", status: :healthy)
      rev = insert(:revision, service: svc, sha: "test-sha")
      insert(:stage_service, stage: stage, service: svc)

      {:ok, promo} = Pipelines.build_promotion(stage)

      assert promo.stage_id == stage.id
      assert promo.revised_at
      [service] = promo.services
      assert service.service_id == svc.id
      assert service.revision_id == rev.id
    end

    test "it will revise a promotion if there is a change" do
      stage = insert(:pipeline_stage)
      svc = insert(:service, sha: "test-sha", status: :healthy)
      rev = insert(:revision, service: svc, sha: "test-sha")
      insert(:stage_service, stage: stage, service: svc)
      promotion = insert(:pipeline_promotion, stage: stage, revised_at: Timex.now()  |> Timex.shift(minutes: -1))
      insert(:promotion_service, promotion: promotion, service: svc, revision: build(:revision))
      other = insert(:promotion_service, promotion: promotion)

      {:ok, promo} = Pipelines.build_promotion(stage)

      assert promo.id == promotion.id
      assert promo.stage_id == stage.id
      refute promo.revised_at == promotion.revised_at
      service = Enum.find(promo.services, & &1.service_id == svc.id)
      assert service.revision_id == rev.id

      assert Enum.find(promo.services, & &1.id == other.id).revision_id == other.revision_id

      assert_receive {:event, %PubSub.PromotionCreated{item: ^promo}}
    end

    test "it will not revise a promotion if the service is not healthy" do
      stage = insert(:pipeline_stage)
      svc = insert(:service, sha: "test-sha", status: :stale)
      insert(:revision, service: svc, sha: "test-sha")
      insert(:stage_service, stage: stage, service: svc)
      promotion = insert(:pipeline_promotion, stage: stage, revised_at: Timex.now()  |> Timex.shift(minutes: -1))
      insert(:promotion_service, promotion: promotion, service: svc, revision: build(:revision))
      insert(:promotion_service, promotion: promotion)

      {:ok, promo} = Pipelines.build_promotion(stage)

      assert promo.id == promotion.id
      assert promo.stage_id == stage.id
      assert promo.revised_at == promotion.revised_at
    end

    test "it won't revise a promotion if there are no changes" do
      stage = insert(:pipeline_stage)
      svc = insert(:service, sha: "test-sha", status: :healthy)
      rev = insert(:revision, service: svc, sha: "test-sha")
      insert(:stage_service, stage: stage, service: svc)
      promotion = insert(:pipeline_promotion, stage: stage, revised_at: Timex.now() |> Timex.shift(minutes: -1))
      insert(:promotion_service, promotion: promotion, service: svc, revision: rev)

      {:ok, promo} = Pipelines.build_promotion(stage)

      assert promo.id == promotion.id
      assert promo.stage_id == stage.id
      assert promo.revised_at == promotion.revised_at
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
      insert(:pipeline_edge, pipeline: pipe, from: dev, to: prod)

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
      promo = insert(:pipeline_promotion, stage: dev)
      insert(:promotion_service, promotion: promo, service: dev_svc, revision: dev_svc.revision)

      {:ok, promod} = Pipelines.apply_promotion(promo)

      assert promod.id == promo.id
      assert promod.promoted_at

      prod_svc = refetch(prod_svc)

      assert prod_svc.git.ref == "test-sha"
      assert prod_svc.git.folder == "k8s"
      {:ok, secrets} = Services.configuration(prod_svc)
      assert secrets["name"] == "new-value"
    end
  end
end
