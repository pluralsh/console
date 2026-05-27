defmodule Console.AI.Vector.PostgresTest do
  use Console.DataCase, async: false
  use Mimic

  alias Console.AI.VectorStore
  alias Console.Deployments.Settings
  alias Console.Schema.{AlertResolution, StackState}
  alias PostgresVectorUtils, as: PG

  describe "init/0 and recreate/0" do
    test "it can initialize and recreate the embeddings table" do
      settings = deployment_settings(ai: %{
        enabled: true,
        vector_store: PG.vector_settings(),
        provider: :openai,
        openai: %{access_token: "key"}
      })

      assert :ok = VectorStore.init()

      update_record(settings, ai: %{vector_store: %{initialized: true, version: 1}})

      assert :ok = VectorStore.recreate()
      assert Settings.fetch_consistent().ai.vector_store.version == Settings.vector_store_version()
    end
  end

  describe "insert/2 and fetch/2" do
    setup do
      deployment_settings(ai: %{
        enabled: true,
        vector_store: PG.vector_settings(),
        provider: :openai,
        openai: %{access_token: "key"}
      })

      assert :ok = VectorStore.init()

      :ok
    end

    test "it can insert and fetch alert resolutions" do
      mini = %AlertResolution.Mini{
        alert_id: "alert-1",
        title: "Pod crash",
        message: "OOMKilled",
        severity: "high",
        resolution: "Increased memory limits",
        type: "prometheus"
      }

      expect(Console.AI.OpenAI, :embeddings, fn _, text ->
        {:ok, [{text, PG.vector()}]}
      end)

      :ok = VectorStore.insert(mini, filters: [flow_id: "flow-1"])

      assert PG.count() > 0

      expect(Console.AI.OpenAI, :embeddings, fn _, "pod crash" ->
        {:ok, [{"pod crash", PG.vector()}]}
      end)

      assert {:ok, [%VectorStore.Response{type: :alert, alert_resolution: fetched}]} =
               VectorStore.fetch("pod crash", filters: [flow_id: "flow-1", datatype: {:raw, :alert_resolution}])

      assert fetched.alert_id == "alert-1"
    end

    test "it can delete by filters" do
      mini = %StackState.Mini{
        identifier: "1",
        resource: "aws_vpc",
        name: "main",
        configuration: "{\"cidr\":\"10.0.0.0/16\"}",
        stack: %{id: "stack-1"}
      }

      expect(Console.AI.OpenAI, :embeddings, fn _, text ->
        {:ok, [{text, PG.vector()}]}
      end)

      :ok = VectorStore.insert(mini, filters: [stack_id: "stack-1"])
      assert PG.count() > 0

      :ok = VectorStore.delete(filters: [stack_id: "stack-1", datatype: {:raw, :stack_state}])
      assert PG.count() == 0
    end

    test "it can expire stale embeddings" do
      mini = %AlertResolution.Mini{
        alert_id: "alert-2",
        title: "Disk full",
        message: "No space left",
        severity: "medium",
        resolution: "Expanded volume",
        type: "prometheus"
      }

      expect(Console.AI.OpenAI, :embeddings, fn _, text ->
        {:ok, [{text, PG.vector()}]}
      end)

      :ok = VectorStore.insert(mini, filters: [flow_id: "flow-2"])

      expiry = Timex.now() |> Timex.shift(hours: 1)
      :ok = VectorStore.expire(filters: [datatype: {:raw, :alert_resolution}], expiry: expiry)

      assert PG.count() == 0
    end

    test "it enforces auth filters on fetch" do
      group = insert(:group)
      user = insert(:user)

      mini = %StackState.Mini{
        identifier: "1",
        resource: "aws_vpc",
        name: "main",
        configuration: "{\"cidr\":\"10.0.0.0/16\"}",
        stack: %{id: "stack-1"}
      }

      expect(Console.AI.OpenAI, :embeddings, fn _, text ->
        {:ok, [{text, PG.vector()}]}
      end)

      :ok = VectorStore.insert(mini,
        filters: [stack_id: "stack-1", user_ids: [user.id], group_ids: [group.id]]
      )

      expect(Console.AI.OpenAI, :embeddings, fn _, "stack" ->
        {:ok, [{"stack", PG.vector()}]}
      end)

      assert {:ok, [_]} =
               VectorStore.fetch("stack",
                 count: 5,
                 filters: [datatype: {:raw, :stack_state}],
                 user: Console.Services.Rbac.preload(user)
               )

      expect(Console.AI.OpenAI, :embeddings, fn _, "stack" ->
        {:ok, [{"stack", PG.vector()}]}
      end)

      assert {:ok, []} =
               VectorStore.fetch("stack",
                 count: 5,
                 filters: [datatype: {:raw, :stack_state}],
                 user: Console.Services.Rbac.preload(insert(:user))
               )
    end
  end
end
