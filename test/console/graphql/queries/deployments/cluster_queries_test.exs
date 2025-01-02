defmodule Console.GraphQl.Deployments.ClusterQueriesTest do
  use Console.DataCase, async: true
  use Mimic

  describe "clusters" do
    test "it can list clusters in the system" do
      clusters = insert_list(3, :cluster)

      {:ok, %{data: %{"clusters" => found}}} = run_query("""
        query {
          clusters(first: 5) {
            edges { node { id name } }
          }
        }
      """, %{}, %{current_user: admin_user()})

      found = from_connection(found)

      assert ids_equal(found, clusters)
      assert Enum.all?(found, & &1["name"])
    end

    test "it can filter by tags" do
      admin = admin_user()
      clusters = insert_list(2, :cluster, tags: [%{name: "t", value: "v"}, %{name: "t2", value: "v2"}])
      clusters2 = insert_list(2, :cluster, tags: [%{name: "t", value: "v"}, %{name: "t2", value: "v3"}])
      insert_list(2, :cluster)

      {:ok, %{data: %{"clusters" => found}}} = run_query("""
        query Clusters($tq: TagQuery!) {
          clusters(first: 5, tagQuery: $tq) {
            edges { node { id } }
          }
        }
      """, %{"tq" => %{"op" => "AND", "tags" => [
        %{"name" => "t", "value" => "v"},
        %{"name" => "t2", "value" => "v2"},
      ]}}, %{current_user: admin})

      assert from_connection(found)
             |> ids_equal(clusters)

      {:ok, %{data: %{"clusters" => found}}} = run_query("""
        query Clusters($tq: TagQuery!) {
          clusters(first: 5, tagQuery: $tq) {
            edges { node { id } }
          }
        }
      """, %{"tq" => %{"op" => "AND", "tags" => [
        %{"name" => "t", "value" => "v"},
      ]}}, %{current_user: admin})

      assert from_connection(found)
            |> ids_equal(clusters ++ clusters2)

      {:ok, %{data: %{"clusters" => found}}} = run_query("""
        query Clusters($tq: TagQuery!) {
          clusters(first: 5, tagQuery: $tq) {
            edges { node { id } }
          }
        }
      """, %{"tq" => %{"op" => "OR", "tags" => [
        %{"name" => "t", "value" => "v"},
        %{"name" => "t2", "value" => "v2"},
      ]}}, %{current_user: admin})

      assert from_connection(found)
             |> ids_equal(clusters ++ clusters2)
    end

    test "it can list clusters by health in the system" do
      clusters = insert_list(3, :cluster, pinged_at: Timex.now())
      others = insert_list(3, :cluster, pinged_at: Timex.now() |> Timex.shift(hours: -1))

      {:ok, %{data: %{"clusters" => found}}} = run_query("""
        query {
          clusters(first: 5, healthy: true) {
            edges { node { id name } }
          }
        }
      """, %{}, %{current_user: admin_user()})

      found = from_connection(found)

      assert ids_equal(found, clusters)
      assert Enum.all?(found, & &1["name"])

      {:ok, %{data: %{"clusters" => found}}} = run_query("""
        query {
          clusters(first: 5, healthy: false) {
            edges { node { id name } }
          }
        }
      """, %{}, %{current_user: admin_user()})

      found = from_connection(found)

      assert ids_equal(found, others)
      assert Enum.all?(found, & &1["name"])
    end

    test "it will respect rbac" do
      user = insert(:user)
      %{group: group} = insert(:group_member, user: user)
      clusters = insert_list(3, :cluster, read_bindings: [%{group_id: group.id}])
      other = insert(:cluster, write_bindings: [%{user_id: user.id}])
      insert_list(3, :cluster)

      {:ok, %{data: %{"clusters" => found}}} = run_query("""
        query {
          clusters(first: 10) { edges { node { id } } }
        }
      """, %{}, %{current_user: user})

      assert from_connection(found)
             |> ids_equal([other | clusters])

      {:ok, %{data: %{"clusters" => found}}} = run_query("""
        query {
          clusters(first: 10) { edges { node { id } } }
        }
      """, %{}, %{current_user: insert(:user)})

      assert from_connection(found) == []
    end
  end

  describe "cluster" do
    test "it can fetch a cluster by id" do
      cluster = insert(:cluster)

      {:ok, %{data: %{"cluster" => found}}} = run_query("""
        query cluster($id: ID!) {
          cluster(id: $id) { id }
        }
      """, %{"id" => cluster.id}, %{current_user: admin_user()})

      assert found["id"] == cluster.id
    end

    test "it can sideload insight components" do
      cluster = insert(:cluster)
      components = insert_list(3, :cluster_insight_component, cluster: cluster)

      {:ok, %{data: %{"cluster" => found}}} = run_query("""
        query cluster($id: ID!) {
          cluster(id: $id) {
            id
            insightComponents { id }
          }
        }
      """, %{"id" => cluster.id}, %{current_user: admin_user()})

      assert found["id"] == cluster.id
      assert ids_equal(found["insightComponents"], components)
    end

    test "writers can query deploy tokens" do
      user = insert(:user)
      cluster = insert(:cluster, write_bindings: [%{user_id: user.id}])

      {:ok, %{data: %{"cluster" => found}}} = run_query("""
        query cluster($id: ID!) {
          cluster(id: $id) { deployToken }
        }
      """, %{"id" => cluster.id}, %{current_user: user})

      assert found["deployToken"] == cluster.deploy_token
    end

    test "non writers cannot query deploy tokens" do
      cluster = insert(:cluster)

      {:ok, %{errors: [_ | _]}} = run_query("""
        query cluster($id: ID!) {
          cluster(id: $id) { deployToken }
        }
      """, %{"id" => cluster.id}, %{current_user: insert(:user)})
    end

    test "it can fetch by deploy token" do
      cluster = insert(:cluster)
      revision = insert(:cluster_revision, cluster: cluster)

      {:ok, %{data: %{"cluster" => found}}} = run_query("""
        query {
          cluster {
            id
            revisions(first: 5) { edges { node { id } } }
          }
        }
      """, %{"id" => cluster.id}, %{cluster: cluster})

      assert found["id"] == cluster.id
      assert from_connection(found["revisions"])
             |> ids_equal([revision])
    end

    test "it can fetch runtime services" do
      user = insert(:user)
      cluster = insert(:cluster, read_bindings: [%{user_id: user.id}], current_version: "1.25")
      runtime = insert(:runtime_service, cluster: cluster, name: "ingress-nginx", version: "1.5.1")

      {:ok, %{data: %{"cluster" => found}}} = run_query("""
        query Cluster($id: ID!) {
          cluster(id: $id) {
            id
            runtimeServices {
              id
              name
              version
              addon { versions { version kube } }
              addonVersion {
                version
                kube
                blocking(kubeVersion: "1.25")
              }
            }
          }
        }
      """, %{"id" => cluster.id}, %{current_user: user})

      assert found["id"] == cluster.id
      [svc] = found["runtimeServices"]
      assert svc["id"] == runtime.id
      assert svc["name"] == "ingress-nginx"
      assert svc["addonVersion"]["blocking"]
      assert svc["addonVersion"]["kube"] == ~w(1.25 1.24 1.23)

      {:ok, %{data: %{"cluster" => found}}} = run_query("""
        query Cluster($id: ID!) {
          cluster(id: $id) {
            id
            runtimeServices {
              id
              name
              version
              addon { versions { version kube } }
              addonVersion {
                version
                kube
                blocking(kubeVersion: "1.24")
              }
            }
          }
        }
      """, %{"id" => cluster.id}, %{current_user: user})

      assert found["id"] == cluster.id
      [svc] = found["runtimeServices"]
      assert svc["id"] == runtime.id
      assert svc["name"] == "ingress-nginx"
      refute svc["addonVersion"]["blocking"]
      assert svc["addonVersion"]["kube"] == ~w(1.25 1.24 1.23)
    end

    test "it can fetch runtime services on weird semver boundaries" do
      user = insert(:user)
      cluster = insert(:cluster, read_bindings: [%{user_id: user.id}], current_version: "1.25")
      runtime = insert(:runtime_service, cluster: cluster, name: "cert-manager", version: "1.13.1")

      {:ok, %{data: %{"cluster" => found}}} = run_query("""
        query Cluster($id: ID!) {
          cluster(id: $id) {
            id
            runtimeServices {
              id
              name
              version
              addon { versions { version kube } }
              addonVersion {
                version
                kube
                blocking(kubeVersion: "1.26")
              }
            }
          }
        }
      """, %{"id" => cluster.id}, %{current_user: user})

      assert found["id"] == cluster.id
      [svc] = found["runtimeServices"]
      assert svc["id"] == runtime.id
      assert svc["name"] == "cert-manager"
      assert svc["version"] == "1.13.1"
      refute svc["addonVersion"]["blocking"]
      assert svc["addonVersion"]["kube"] == ~w(1.27 1.26 1.25 1.24 1.23 1.22 1.21)
    end

    test "it can fetch cluster metrics" do
      user = admin_user()
      cluster = insert(:cluster)
      deployment_settings(prometheus_connection: %{url: "example.com"})

      expect(HTTPoison, :post, 9, fn _, _, _ ->
        {:ok, %HTTPoison.Response{status_code: 200, body: Poison.encode!(%{data: %{result: [
          %{values: [[1, "1"]]}
        ]}})}}
      end)


      {:ok, %{data: %{"cluster" => found}}} = run_query("""
        query cluster($id: ID!) {
          cluster(id: $id) {
            id
            clusterMetrics {
              cpu { values { timestamp value } }
            }
          }
        }
      """, %{"id" => cluster.id}, %{current_user: user})

      assert found["id"] == cluster.id
      refute Enum.empty?(found["clusterMetrics"]["cpu"])
    end

    test "it can fetch cluster audit logs" do
      user    = admin_user()
      cluster = insert(:cluster)
      audits  = insert_list(3, :cluster_audit_log, cluster: cluster)

      {:ok, %{data: %{"cluster" => found}}} = run_query("""
        query cluster($id: ID!) {
          cluster(id: $id) {
            auditLogs(first: 5) {
              edges { node { id } }
            }
          }
        }
      """, %{"id" => cluster.id}, %{current_user: user})

      assert from_connection(found["auditLogs"])
             |> ids_equal(audits)
    end

    test "it can fetch cluster node metrics" do
      user = admin_user()
      cluster = insert(:cluster)
      deployment_settings(prometheus_connection: %{url: "example.com"})

      expect(HTTPoison, :post, 4, fn _, _, _ ->
        {:ok, %HTTPoison.Response{status_code: 200, body: Poison.encode!(%{data: %{result: [
          %{values: [[1, "1"]]}
        ]}})}}
      end)


      {:ok, %{data: %{"cluster" => found}}} = run_query("""
        query cluster($id: ID!) {
          cluster(id: $id) {
            id
            clusterNodeMetrics(node: "some-node") {
              cpu { values { timestamp value } }
            }
          }
        }
      """, %{"id" => cluster.id}, %{current_user: user})

      assert found["id"] == cluster.id
      refute Enum.empty?(found["clusterNodeMetrics"]["cpu"])
    end

    test "it respects rbac" do
      user = insert(:user)
      cluster = insert(:cluster, read_bindings: [%{user_id: user.id}])

      {:ok, %{data: %{"cluster" => found}}} = run_query("""
        query cluster($id: ID!) {
          cluster(id: $id) { id }
        }
      """, %{"id" => cluster.id}, %{current_user: user})

      assert found["id"] == cluster.id

      {:ok, %{errors: [_ | _]}} = run_query("""
        query cluster($id: ID!) {
          cluster(id: $id) { id }
        }
      """, %{"id" => cluster.id}, %{current_user: insert(:user)})
    end

    test "it can fetch policy constraints for a cluster" do
      cluster = insert(:cluster)
      constraints = insert_list(3, :policy_constraint, cluster: cluster)

      {:ok, %{data: %{"cluster" => found}}} = run_query("""
        query cluster($id: ID!) {
          cluster(id: $id) {
            policyConstraints(first: 5) {
              edges { node { id } }
            }
          }
        }
      """, %{"id" => cluster.id}, %{current_user: admin_user()})

      assert from_connection(found["policyConstraints"])
             |> ids_equal(constraints)
    end

    test "it can fetch pinned custom resources for a cluster" do
      cluster = insert(:cluster)
      first = insert_list(2, :pinned_custom_resource, cluster: cluster)
      second = insert_list(3, :pinned_custom_resource, cluster_id: nil, cluster: nil)

      {:ok, %{data: %{"cluster" => found}}} = run_query("""
        query Cluster($id: ID!) {
          cluster(id: $id) {
            pinnedCustomResources { id }
          }
        }
      """, %{"id" => cluster.id}, %{current_user: admin_user()})

      assert ids_equal(found["pinnedCustomResources"], first ++ second)
    end
  end

  describe "runtimeService" do
    test "it can fetch an individual runtime service by id" do
      user = insert(:user)
      cluster = insert(:cluster, read_bindings: [%{user_id: user.id}], current_version: "1.25")
      runtime = insert(:runtime_service, cluster: cluster, name: "ingress-nginx", version: "1.5.1")

      {:ok, %{data: %{"runtimeService" => rs}}} = run_query("""
        query Runtime($id: ID!) {
          runtimeService(id: $id) {
            id
            addon { versions { version kube } }
          }
        }
      """, %{"id" => runtime.id}, %{current_user: user})

      assert rs["id"] == runtime.id
      # assert rs["addon"]["readme"]
    end

    test "users w/o cluster read cannot fetch a runtime service by id" do
      user = insert(:user)
      cluster = insert(:cluster, current_version: "1.25")
      runtime = insert(:runtime_service, cluster: cluster, name: "ingress-nginx", version: "1.5.1")

      {:ok, %{errors: [_ | _]}} = run_query("""
        query Runtime($id: ID!) {
          runtimeService(id: $id) {
            id
            addon {
              versions { version kube }
            }
          }
        }
      """, %{"id" => runtime.id}, %{current_user: user})
    end
  end


  describe "clusterProviders" do
    test "it will list cluster providers" do
      user = admin_user()
      providers = for cloud <- ~w(aws gcp azure),
        do: insert(:cluster_provider, cloud: cloud)

      {:ok, %{data: %{"clusterProviders" => found}}} = run_query("""
        query {
          clusterProviders(first: 5) { edges { node { id supportedVersions } } }
        }
      """, %{}, %{current_user: user})

      assert from_connection(found)
             |> ids_equal(providers)
      refute from_connection(found)
             |> Enum.any?(&Enum.empty?(&1["supportedVersions"]))
    end

    test "it will respect rbac" do
      user = insert(:user)
      %{group: group} = insert(:group_member, user: user)
      providers = insert_list(3, :cluster_provider, write_bindings: [%{group_id: group.id}])
      other = insert(:cluster_provider, read_bindings: [%{user_id: user.id}])
      insert_list(3, :cluster_provider)

      {:ok, %{data: %{"clusterProviders" => found}}} = run_query("""
        query {
          clusterProviders(first: 10) { edges { node { id } } }
        }
      """, %{}, %{current_user: user})

      assert from_connection(found)
             |> ids_equal([other | providers])

      {:ok, %{data: %{"clusterProviders" => found}}} = run_query("""
        query {
          clusterProviders(first: 10) { edges { node { id } } }
        }
      """, %{}, %{current_user: insert(:user)})

      assert from_connection(found) == []
    end
  end

  describe "clusterProvider" do
    test "it can fetch a cluster provider by id" do
      admin = admin_user()
      provider = insert(:cluster_provider)

      {:ok, %{data: %{"clusterProvider" => updated}}} = run_query("""
        query provider($id: ID!) {
          clusterProvider(id: $id) { id }
        }
      """, %{"id" => provider.id}, %{current_user: admin})

      assert updated["id"] == provider.id
    end

    test "it respects rbac" do
      admin = insert(:user)
      provider = insert(:cluster_provider)

      {:ok, %{errors: [_ | _]}} = run_query("""
        query provider($id: ID!) {
          clusterProvider(id: $id) { id }
        }
      """, %{"id" => provider.id}, %{current_user: admin})
    end
  end

  describe "myCluster" do
    test "it can fetch a cluster back by deploy token" do
      cluster = insert(:cluster)

      {:ok, %{data: %{"myCluster" => found}}} = run_query("""
        query {
          myCluster { id }
        }
      """, %{}, %{cluster: cluster})

      assert found["id"] == cluster.id
    end
  end

  describe "tokenExchange" do
    test "it can exchange a kubeconfig token for a user if they have access to the given cluster" do
      user = insert(:user)
      cluster = insert(:cluster, read_bindings: [%{user_id: user.id}])
      token = insert(:access_token, user: user)

      {:ok, %{data: %{"tokenExchange" => found}}} = run_query("""
        query Exchange($token: String!) {
          tokenExchange(token: $token) { id }
        }
      """, %{"token" => "plrl:#{cluster.id}:#{token.token}"})

      assert found["id"] == user.id
    end

    # test "if the user doesn't have access it will error" do
    #   user = insert(:user)
    #   cluster = insert(:cluster)
    #   token = insert(:access_token, user: user)

    #   {:ok, %{errors: [_ | _]}} = run_query("""
    #     query Exchange($token: String!) {
    #       tokenExchange(token: $token) { id }
    #     }
    #   """, %{"token" => "plrl:#{cluster.id}:#{token.token}"})
    # end

    test "if the token is invalid it will error" do
      user = insert(:user)
      cluster = insert(:cluster, read_bindings: [%{user_id: user.id}])

      {:ok, %{errors: [_ | _]}} = run_query("""
        query Exchange($token: String!) {
          tokenExchange(token: $token) { id }
        }
      """, %{"token" => "plrl:#{cluster.id}:console-bogus"})
    end

    test "if the cluster doesn't exist it will error" do
      user = insert(:user)
      token = insert(:access_token, user: user)

      {:ok, %{errors: [_ | _]}} = run_query("""
        query Exchange($token: String!) {
          tokenExchange(token: $token) { id }
        }
      """, %{"token" => "plrl:#{Ecto.UUID.generate()}:#{token.token}"})
    end
  end

  describe "clusterStatuses" do
    test "it can aggregate statuses for all visible clusters" do
      admin = admin_user()
      insert_list(2, :cluster, pinged_at: Timex.now())
      insert_list(3, :cluster, pinged_at: Timex.now() |> Timex.shift(days: -1))
      insert(:cluster)

      {:ok, %{data: %{"clusterStatuses" => res}}} = run_query("""
        query {
          clusterStatuses {
            healthy
            count
          }
        }
      """, %{}, %{current_user: admin})

      assert length(res) == 3
      as_map = Map.new(res, & {&1["healthy"], &1})
      assert as_map[true]["count"] == 2
      assert as_map[false]["count"] == 3
      assert as_map[nil]["count"] == 1
    end
  end

  describe "upgradeStatistics" do
    test "it can aggregate statuses for all visible clusters" do
      admin = admin_user()
      insert_list(2, :cluster, current_version: "1.30", pinged_at: Timex.now(), upgrade_plan: %{compatibilities: true, incompatibilities: true, deprecations: true})
      insert_list(3, :cluster, current_version: "1.31", pinged_at: Timex.now() |> Timex.shift(days: -1))
      insert_list(2, :cluster, current_version: "1.28")

      {:ok, %{data: %{"upgradeStatistics" => res}}} = run_query("""
        query {
          upgradeStatistics {
            upgradeable
            compliant
            latest
            count
          }
        }
      """, %{}, %{current_user: admin})

      assert res["count"] == 7
      assert res["upgradeable"] == 2
      assert res["compliant"] == 5
      assert res["latest"] == 3
    end
  end

  describe "tags" do
    test "it can list cluster tag names and values" do
      user = insert(:user)
      cluster = insert(:cluster)
      insert(:tag, cluster: cluster, name: "first", value: "value")
      insert(:tag, cluster: cluster, name: "second", value: "value")
      insert(:tag, cluster: build(:cluster), name: "first", value: "value2")

      {:ok, %{data: %{"tags" => ["first", "second"]}}} = run_query("""
        query {
          tags
        }
      """, %{}, %{current_user: user})

      {:ok, %{data: %{"tags" => ["value", "value2"]}}} = run_query("""
        query {
          tags(tag: "first")
        }
      """, %{}, %{current_user: user})
    end
  end

  describe "tagPairs" do
    test "it can list cluster tag names and values" do
      user = insert(:user)
      cluster = insert(:cluster)
      t1 = insert(:tag, cluster: cluster, name: "first", value: "value")
      t2 = insert(:tag, cluster: cluster, name: "second", value: "value")
      t3 = insert(:tag, cluster: build(:cluster), name: "first", value: "value2")

      {:ok, %{data: %{"tagPairs" => tags}}} = run_query("""
        query {
          tagPairs(first: 5) {
            edges { node { id } }
          }
        }
      """, %{}, %{current_user: user})

      assert from_connection(tags)
             |> ids_equal([t1, t2, t3])

      {:ok, %{data: %{"tagPairs" => tags}}} = run_query("""
        query Tags($q: String) {
          tagPairs(q: $q, first: 5) {
            edges { node { id } }
          }
        }
      """, %{"q" => "first"}, %{current_user: user})

      assert from_connection(tags)
             |> ids_equal([t1, t3])
    end
  end

  describe "clusterUsages" do
    test "it can list usage information for clusters" do
      clusters = insert_list(3, :cluster_usage)

      {:ok, %{data: %{"clusterUsages" => found}}} = run_query("""
        query {
          clusterUsages(first: 5) {
            edges { node { id } }
          }
        }
      """, %{}, %{current_user: admin_user()})

      assert from_connection(found)
             |> ids_equal(clusters)
    end
  end

  describe "clusterUsage" do
    test "it can fetch a cluster by usage" do
      usage = insert(:cluster_usage)
      nsu = insert_list(4, :cluster_namespace_usage, cluster: usage.cluster)
      sr = insert_list(3, :cluster_scaling_recommendation, cluster: usage.cluster)
      hist = for i <- 1..3 do
        insert(:cluster_usage_history,
          cluster: usage.cluster,
          timestamp: Timex.now() |> Timex.shift(days: -i)
        )
      end

      {:ok, %{data: %{"clusterUsage" => found}}} = run_query("""
        query Usage($id: ID!) {
          clusterUsage(id: $id) {
            id
            namespaces(first: 5) {
              edges { node { id } }
            }
            recommendations(first: 5) {
              edges { node { id } }
            }
            history(first: 5) {
              edges { node { id } }
            }
          }
        }
      """, %{"id" => usage.id}, %{current_user: admin_user()})

      assert found["id"] == usage.id
      assert from_connection(found["namespaces"])
             |> ids_equal(nsu)
      assert from_connection(found["recommendations"])
             |> ids_equal(sr)
      assert from_connection(found["history"])
             |> ids_equal(hist)
    end
  end
end
