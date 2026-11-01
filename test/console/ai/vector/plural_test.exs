defmodule Console.AI.Vector.PluralTest do
  use Console.DataCase, async: false
  use Mimic
  alias Console.AI.VectorStore
  alias Console.AI.Vector.Buffer
  alias Console.AI.Vector.Plural.{Document, Write}
  alias Console.Deployments.Settings
  alias Console.Schema.Catalog

  setup :set_mimic_global

  @host "http://vector:8080"

  describe "insert/2" do
    test "it buffers documents and defers embedding to the vector db" do
      plural_settings(defer_embeddings: true)
      reject(Console.AI.OpenAI, :embeddings, 2)
      catalog = insert(:catalog)

      :ok = VectorStore.insert(Catalog.Mini.new(catalog), filters: [catalog_id: catalog.id, user_ids: ["u"], group_ids: []])

      expect(Req, :request, fn opts ->
        assert opts[:method] == :post
        assert opts[:url] == "#{@host}/api/v1/namespaces/console/write"
        assert %Write{upsert_documents: [%Document{id: id}]} = opts[:json]
        assert id == catalog.id

        [doc] = json(opts)["upsert_documents"]
        assert doc["attributes"]["datatype"] == "catalog"
        assert doc["attributes"]["catalog_id"] == catalog.id
        assert doc["attributes"]["user_ids"] == ["u"]
        assert Jason.decode!(doc["attributes"]["data"])["name"] == catalog.name
        [passage] = doc["passages"]
        assert passage["text"] =~ catalog.name
        refute Map.has_key?(passage, "vector")
        refute Map.has_key?(json(opts), "delete_by_filter")
        {:ok, %Req.Response{status: 200, body: %{"rows_upserted" => 1}}}
      end)

      :ok = Buffer.flush()
    end

    test "it retries writes the vector db couldn't serve" do
      plural_settings(defer_embeddings: true)
      catalog = insert(:catalog)

      :ok = VectorStore.insert(Catalog.Mini.new(catalog))

      expect(Req, :request, 2, fn opts ->
        assert %Write{upsert_documents: [%Document{id: id}]} = opts[:json]
        assert id == catalog.id

        case Process.put(:attempted, true) do
          nil -> {:ok, %Req.Response{status: 503, body: %{"status" => "error", "message" => "shard splitting"}}}
          true -> {:ok, %Req.Response{status: 200, body: %{}}}
        end
      end)

      {:error, _} = Buffer.flush()
      :ok = Buffer.flush()
    end

    test "it trims passages that would exceed the request limit" do
      plural_settings(defer_embeddings: false)
      vector = for i <- 1..512, do: i / 1_000_003
      expect(Console.AI.OpenAI, :embeddings, fn _, text -> {:ok, for(_ <- 1..400, do: {text, vector})} end)

      :ok = VectorStore.insert(Catalog.Mini.new(insert(:catalog)))

      expect(Req, :request, fn opts ->
        %Write{upsert_documents: [%Document{passages: passages}]} = opts[:json]
        assert length(passages) in 1..399
        assert IO.iodata_length(Jason.encode_to_iodata!(opts[:json])) <= 1_536 * 1024 + 64
        {:ok, %Req.Response{status: 200, body: %{}}}
      end)

      :ok = Buffer.flush()
    end

    test "it rejects documents whose payload alone exceeds the request limit" do
      plural_settings(defer_embeddings: true)
      mini = %{Catalog.Mini.new(insert(:catalog)) | description: String.duplicate("x", 2_000_000)}
      reject(Req, :request, 1)

      {:error, msg} = VectorStore.insert(mini)

      assert msg =~ "too large to index"
      :ok = Buffer.flush()
    end

    test "it computes embeddings in the console when not deferred" do
      plural_settings(defer_embeddings: false)
      expect(Console.AI.OpenAI, :embeddings, fn _, text -> {:ok, [{text, [0.1, 0.2]}]} end)

      :ok = VectorStore.insert(Catalog.Mini.new(insert(:catalog)))

      expect(Req, :request, fn opts ->
        [%{"passages" => [passage]}] = json(opts)["upsert_documents"]
        assert passage == %{"vector" => [0.1, 0.2]}
        {:ok, %Req.Response{status: 200, body: %{}}}
      end)

      :ok = Buffer.flush()
    end

  end

  describe "delete/1" do
    test "it batches deletes with unrelated inserts in one write" do
      plural_settings(defer_embeddings: true)
      catalog = insert(:catalog)

      :ok = VectorStore.delete(filters: [stack_id: "stack", datatype: {:raw, :stack_state}])
      :ok = VectorStore.insert(Catalog.Mini.new(catalog), filters: [catalog_id: catalog.id])
      :ok = VectorStore.delete(filters: [catalog_id: "other"])

      expect(Req, :request, fn opts ->
        assert %Write{delete_by_filter: filter, upsert_documents: [%Document{id: id}]} = opts[:json]
        assert id == catalog.id
        assert filter == %{op: "Or", filters: [
          %{op: "And", filters: [
            %{op: "Eq", attribute: "stack_id", value: "stack"},
            %{op: "Eq", attribute: "datatype", value: "stack_state"}
          ]},
          %{op: "Eq", attribute: "catalog_id", value: "other"}
        ]}
        {:ok, %Req.Response{status: 200, body: %{}}}
      end)

      :ok = Buffer.flush()
    end

    test "a delete matching a buffered document flushes it first" do
      plural_settings(defer_embeddings: true)
      catalog = insert(:catalog)

      :ok = VectorStore.insert(Catalog.Mini.new(catalog), filters: [catalog_id: catalog.id])

      expect(Req, :request, fn opts ->
        assert %Write{delete_by_filter: nil, upsert_documents: [_]} = opts[:json]
        {:ok, %Req.Response{status: 200, body: %{}}}
      end)

      :ok = VectorStore.delete(filters: [catalog_id: catalog.id])

      expect(Req, :request, fn opts ->
        assert opts[:json] == %Write{delete_by_filter: %{op: "Eq", attribute: "catalog_id", value: catalog.id}}
        {:ok, %Req.Response{status: 200, body: %{}}}
      end)

      :ok = Buffer.flush()
    end
  end

  describe "fetch/2" do
    test "it queries by text and decodes rows" do
      plural_settings(defer_embeddings: true)
      catalog = insert(:catalog)

      expect(Req, :request, fn opts ->
        assert opts[:url] == "#{@host}/api/v1/namespaces/console/query"
        body = json(opts)
        assert body["rank_by"] == %{"op" => "ANN", "text" => "some text"}
        assert body["filters"] == %{"op" => "In", "attribute" => "datatype", "values" => ["catalog", "pr_automation"]}
        assert body["limit"]["per"] == %{"attributes" => ["$doc_id"], "limit" => 1}

        data = Console.JSON.encode!(Console.mapify(Catalog.Mini.new(catalog)))
        {:ok, %Req.Response{status: 200, body: %{"rows" => [%{"id" => "#{catalog.id}#0", "datatype" => "catalog", "data" => data}]}}}
      end)

      {:ok, [result]} = VectorStore.fetch("some text", filters: [datatype: {:raw, [:catalog, :pr_automation]}])

      assert result.type == :catalog
      assert result.catalog.id == catalog.id
      assert result.catalog.name == catalog.name
    end
  end

  describe "init/0" do
    test "it leaves the namespace to be managed out of band" do
      plural_settings(defer_embeddings: true, initialized: false)
      reject(Req, :request, 1)

      :ok = VectorStore.init()

      assert Settings.fetch_consistent().ai.vector_store.initialized
    end
  end

  describe "recreate/0" do
    test "it clears every row in the namespace" do
      plural_settings(defer_embeddings: true)

      expect(Req, :request, fn opts ->
        assert opts[:json] == %Write{delete_by_filter: %{op: "Exists", attribute: "datatype"}}
        {:ok, %Req.Response{status: 200, body: %{"rows_deleted" => 3}}}
      end)

      :ok = VectorStore.recreate()
    end
  end

  defp json(opts), do: opts[:json] |> Jason.encode!() |> Jason.decode!()

  defp plural_settings(opts) do
    deployment_settings(ai: %{
      enabled: true,
      vector_store: %{
        enabled: true,
        initialized: Keyword.get(opts, :initialized, true),
        version: Settings.vector_store_version(),
        store: :plural,
        plural: %{host: @host, namespace: "console", defer_embeddings: opts[:defer_embeddings]}
      },
      provider: :openai,
      openai: %{access_token: "key"}
    })
  end
end
