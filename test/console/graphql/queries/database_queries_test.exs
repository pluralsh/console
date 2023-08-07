defmodule Console.GraphQl.DatabaseQueriesTest do
  use Console.DataCase, async: true
  use Mimic
  import KubernetesScaffolds

  describe "postgresDatabases" do
    test "it can list postgres databases" do
      pgs = Enum.map(~w(first second), &postgres/1)
      admin = admin_user()
      expect(Kube.Client, :list_postgresqls, fn -> {:ok, pgs} end)
      expect(Console.Features, :available?, fn :databaseManagement -> true end)

      {:ok, %{data: %{"postgresDatabases" => found}}} = run_query("""
        query {
          postgresDatabases {
            metadata { name }
          }
        }
      """, %{}, %{current_user: admin})

      assert Enum.map(found, & &1["metadata"]["name"]) == Enum.map(pgs, & &1.metadata.name)
    end

    test "it cannot list postgres databases" do
      admin = admin_user()
      expect(Console.Features, :available?, fn :databaseManagement -> false end)

      {:ok, %{errors: [_ | _]}} = run_query("""
        query {
          postgresDatabases {
            metadata { name }
          }
        }
      """, %{}, %{current_user: admin})
    end
  end

  describe "postgresDatabase" do
    test "it can fetch a postgres database" do
      pg = postgres("name")
      admin = admin_user()
      expect(Kube.Client, :get_postgresql, fn _, _ -> {:ok, pg} end)
      expect(Console.Features, :available?, fn :databaseManagement -> true end)

      {:ok, %{data: %{"postgresDatabase" => found}}} = run_query("""
        query {
          postgresDatabase(name: "name", namespace: "namespace") {
            metadata { name }
            spec {
              postgresql { version }
              teamId
              resources { requests { cpu memory } }
            }
            status { clusterStatus }
          }
        }
      """, %{}, %{current_user: admin})

      assert found["metadata"]["name"] == "name"
      assert found["status"]["clusterStatus"] == "Running"
      assert found["spec"]["postgresql"]["version"] == "13"
      assert found["spec"]["teamId"] == "plural"
      assert found["spec"]["resources"]["requests"]["cpu"] == "1"
      assert found["spec"]["resources"]["requests"]["memory"] == "1Gi"
    end

    test "it can sideload pg instance history" do
      pg = postgres("name")
      admin = admin_user()
      instances = insert_list(3, :postgres_instance, name: pg.metadata.name, namespace: pg.metadata.namespace)
      expect(Kube.Client, :get_postgresql, fn _, _ -> {:ok, pg} end)
      expect(Console.Features, :available?, fn :databaseManagement -> true end)

      {:ok, %{data: %{"postgresDatabase" => found}}} = run_query("""
        query {
          postgresDatabase(name: "name", namespace: "namespace") {
            metadata { name }
            instances { uid }
          }
        }
      """, %{}, %{current_user: admin})

      assert MapSet.new(instances, & &1.uid)
             |> MapSet.equal?(MapSet.new(found["instances"], & &1["uid"]))
    end

    test "it cannot fetch a postgres database if feature is not enabled" do
      admin = admin_user()
      expect(Console.Features, :available?, fn :databaseManagement -> false end)

      {:ok, %{errors: [_ | _]}} = run_query("""
        query {
          postgresDatabase(name: "name", namespace: "namespace") {
            metadata { name }
          }
        }
      """, %{}, %{current_user: admin})
    end

    test "nonadmins cannot fetch db" do
      {:ok, %{errors: [_ | _]}} = run_query("""
        query {
          postgresDatabase(name: "name", namespace: "namespace") {
            metadata { name }
            spec {
              postgresql { version }
              teamId
              resources { requests { cpu memory } }
            }
            status { clusterHealth }
          }
        }
      """, %{}, %{current_user: insert(:user)})
    end
  end
end
