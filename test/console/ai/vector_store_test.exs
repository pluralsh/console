defmodule Console.AI.VectorStoreTest do
  use Console.DataCase, async: false
  use Mimic
  alias Console.AI.VectorStore
  alias ElasticsearchUtils, as: ES
  alias Console.Deployments.Settings

  describe "init/0" do
    test "it can migrate a vector store index" do
      settings = deployment_settings(ai: %{
        enabled: true,
        vector_store: %{
          enabled: true,
          store: :elastic,
          elastic: ES.es_vector_settings(),
        },
        provider: :openai,
        openai: %{access_token: "key"}
      })

      ES.drop_index(ES.vector_index())

      VectorStore.init()

      update_record(settings, ai: %{vector_store: %{initialized: true, version: 1}})

      :ok = VectorStore.recreate()

      assert Settings.fetch_consistent().ai.vector_store.version == Settings.vector_store_version()
    end
  end

  describe "fetch/2" do
    test "it recreates a missing index in the background" do
      deployment_settings(ai: %{
        enabled: true,
        vector_store: %{
          enabled: true,
          initialized: true,
          version: Settings.vector_store_version(),
          store: :elastic,
          elastic: ES.es_vector_settings(),
        },
        provider: :openai,
        openai: %{access_token: "key"}
      })
      expect(Console.AI.OpenAI, :embeddings, fn _, text -> {:ok, [{text, ES.vector()}]} end)

      ES.drop_index(ES.vector_index())

      {:error, msg} = VectorStore.fetch("some text")
      assert msg =~ "index_not_found_exception"

      assert wait_for_index(ES.vector_index())
    end
  end

  defp wait_for_index(index, attempts \\ 50)
  defp wait_for_index(_, 0), do: false
  defp wait_for_index(index, attempts) do
    case ES.get_index(index) do
      {:ok, %HTTPoison.Response{status_code: 200, body: body}} ->
        body =~ "dense_vector"
      _ ->
        :timer.sleep(100)
        wait_for_index(index, attempts - 1)
    end
  end
end
