defmodule Console.AI.VectorStoreTest do
  use Console.DataCase, async: false
  alias Console.AI.VectorStore
  alias ElasticsearchUtils, as: ES

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

      assert Console.Deployments.Settings.fetch_consistent().ai.vector_store.version == 2
    end
  end
end
