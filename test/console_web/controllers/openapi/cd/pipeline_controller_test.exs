defmodule ConsoleWeb.OpenAPI.CD.PipelineControllerTest do
  use ConsoleWeb.ConnCase, async: true
  use Mimic

  describe "#show/2" do
    test "returns the pipeline if you can read", %{conn: conn} do
      user = admin_user()
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      pipeline = insert(:pipeline, project: project)
      stage = insert(:pipeline_stage, pipeline: pipeline)
      insert(:pipeline_edge, pipeline: pipeline, from: stage, to: insert(:pipeline_stage, pipeline: pipeline))

      result =
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/cd/pipelines/#{pipeline.id}")
        |> json_response(200)

      assert result["id"] == pipeline.id
      assert result["name"] == pipeline.name
      assert result["project_id"] == project.id
      assert is_list(result["stages"])
      assert is_list(result["edges"])
    end

    test "it 403s if you cannot read", %{conn: conn} do
      user = insert(:user)
      project = insert(:project)
      pipeline = insert(:pipeline, project: project)

      conn
      |> add_auth_headers(user)
      |> get("/v1/api/cd/pipelines/#{pipeline.id}")
      |> json_response(403)
    end
  end

  describe "#index/2" do
    test "returns the list of pipelines", %{conn: conn} do
      user = admin_user()
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      pipelines = insert_list(3, :pipeline, project: project)

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/cd/pipelines")
        |> json_response(200)

      assert ids_equal(results, pipelines)
    end

    test "filters by project_id", %{conn: conn} do
      user = admin_user()
      project1 = insert(:project, write_bindings: [%{user_id: user.id}])
      project2 = insert(:project, write_bindings: [%{user_id: user.id}])
      pipelines1 = insert_list(2, :pipeline, project: project1)
      insert_list(2, :pipeline, project: project2)

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/cd/pipelines?project_id=#{project1.id}")
        |> json_response(200)

      assert ids_equal(results, pipelines1)
    end

    test "searches by name with q parameter", %{conn: conn} do
      user = admin_user()
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      pipeline1 = insert(:pipeline, project: project, name: "matching-pipeline")
      insert(:pipeline, project: project, name: "other-pipeline")

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/cd/pipelines?q=matching")
        |> json_response(200)

      assert length(results) == 1
      assert hd(results)["id"] == pipeline1.id
    end

    test "supports pagination", %{conn: conn} do
      user = admin_user()
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      insert_list(5, :pipeline, project: project)

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/cd/pipelines?page=1&per_page=2")
        |> json_response(200)

      assert length(results) == 2
    end
  end

  describe "#trigger/2" do
    test "it can trigger a pipeline by creating a context", %{conn: conn} do
      user = admin_user()
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      pipeline = insert(:pipeline, project: project, write_bindings: [%{user_id: user.id}])
      stage = insert(:pipeline_stage, pipeline: pipeline)
      insert(:pipeline_edge, pipeline: pipeline, from: stage, to: insert(:pipeline_stage, pipeline: pipeline))

      result =
        conn
        |> add_auth_headers(user)
        |> json_post("/v1/api/cd/pipelines/#{pipeline.id}/trigger", %{
          context: %{version: "1.0.0", environment: "production"}
        })
        |> json_response(200)

      assert result["id"]
      assert result["pipeline_id"] == pipeline.id
      assert result["context"]["version"] == "1.0.0"
      assert result["context"]["environment"] == "production"
    end

    test "it can trigger a pipeline with an empty context", %{conn: conn} do
      user = admin_user()
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      pipeline = insert(:pipeline, project: project, write_bindings: [%{user_id: user.id}])
      stage = insert(:pipeline_stage, pipeline: pipeline)
      insert(:pipeline_edge, pipeline: pipeline, from: stage, to: insert(:pipeline_stage, pipeline: pipeline))

      result =
        conn
        |> add_auth_headers(user)
        |> json_post("/v1/api/cd/pipelines/#{pipeline.id}/trigger", %{
          context: %{}
        })
        |> json_response(200)

      assert result["id"]
      assert result["pipeline_id"] == pipeline.id
    end

    test "non-writers cannot trigger a pipeline", %{conn: conn} do
      user = insert(:user)
      project = insert(:project)
      pipeline = insert(:pipeline, project: project)

      conn
      |> add_auth_headers(user)
      |> json_post("/v1/api/cd/pipelines/#{pipeline.id}/trigger", %{
        context: %{version: "1.0.0"}
      })
      |> json_response(403)
    end
  end
end
