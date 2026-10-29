defmodule ConsoleWeb.ComponentControllerTest do
  use ConsoleWeb.ConnCase, async: true

  @component %{
    "name" => "nginx",
    "namespace" => "default",
    "group" => "apps",
    "version" => "v1",
    "kind" => "Deployment",
    "synced" => true,
    "state" => "running",
    "uid" => "deploy-uid",
    "id" => "ignored",
    "content" => %{"desired" => "kind: Deployment", "live" => "kind: Deployment"},
    "children" => [%{"uid" => "rs-uid", "name" => "nginx-abc", "group" => "apps", "version" => "v1", "kind" => "ReplicaSet", "state" => "running"}]
  }

  describe "#update/2" do
    test "it replaces a service's components like updateServiceComponents", %{conn: conn} do
      cluster = insert(:cluster)
      service = insert(:service, cluster: cluster)

      body = %{
        "components" => [@component],
        "revision_id" => service.revision_id,
        "sha" => nil,
        "errors" => [%{"source" => "sync", "message" => "something broke", "warning" => true}],
        "metadata" => %{"images" => ["nginx:latest"]}
      }

      ids = for _ <- 1..2 do
        assert %{"id" => id} =
          conn
          |> add_auth_headers(cluster)
          |> post_json("/ext/v1/services/#{service.id}/components", body)
          |> json_response(200)
        assert id == service.id

        %{components: [component]} = Console.Repo.preload(refetch(service), [components: [:content, :children]], force: true)
        {component.id, Enum.map(component.children, & &1.id)}
      end

      assert [same, same] = ids

      svc = Console.Repo.preload(refetch(service), [:errors, components: [:content, :children]])
      [component] = svc.components
      assert component.kind == "Deployment"
      assert component.state == :running
      assert component.synced
      assert component.content.desired == "kind: Deployment"
      assert [%{uid: "rs-uid", kind: "ReplicaSet", state: :running}] = component.children
      assert [%{source: "sync", message: "something broke", warning: true}] = svc.errors
      assert svc.metadata.images == ["nginx:latest"]
      assert svc.component_status == "1 / 1"
    end

    test "it rejects invalid component states", %{conn: conn} do
      cluster = insert(:cluster)
      service = insert(:service, cluster: cluster)

      conn
      |> add_auth_headers(cluster)
      |> post_json("/ext/v1/services/#{service.id}/components", %{"components" => [%{@component | "state" => "exploded"}]})
      |> json_response(422)
    end

    test "malformed components are rejected by the changesets", %{conn: conn} do
      cluster = insert(:cluster)
      service = insert(:service, cluster: cluster)
      path = "/ext/v1/services/#{service.id}/components"

      conn
      |> add_auth_headers(cluster)
      |> post_json(path, %{"components" => [@component], "errors" => [%{"source" => "sync", "message" => "broke"}]})
      |> json_response(200)

      for body <- [
        %{"components" => [Map.delete(@component, "kind")]},
        %{"components" => [%{@component | "children" => [%{"name" => "no-uid"}, "not-a-child"]}]},
        %{"components" => "not-a-list"},
        %{"components" => [@component], "errors" => ["not-an-error"]}
      ] do
        conn
        |> add_auth_headers(cluster)
        |> post_json(path, body)
        |> json_response(422)
      end
    end

    test "services of other clusters or that don't exist aren't 404s", %{conn: conn} do
      cluster = insert(:cluster)

      for id <- [insert(:service).id, Ecto.UUID.generate()] do
        conn = conn
               |> add_auth_headers(cluster)
               |> post_json("/ext/v1/services/#{id}/components", %{"components" => [@component]})

        assert conn.status in [401, 403]
      end
    end

    test "it requires a cluster token", %{conn: conn} do
      service = insert(:service)

      conn
      |> add_auth_headers(admin_user())
      |> post_json("/ext/v1/services/#{service.id}/components", %{"components" => []})
      |> json_response(403)
    end
  end

  defp post_json(conn, path, body) do
    conn
    |> put_req_header("content-type", "application/json")
    |> post(path, Jason.encode!(body))
  end
end
