defmodule Console.AI.Tools.Agent.StackTest do
  use Console.DataCase, async: true
  use Mimic
  import ElasticsearchUtils
  alias Console.AI.Tools.Agent.Stack

  describe "implement/1" do
    test "it can fetch stacks" do
      deployment_settings(
        logging: %{enabled: true, driver: :elastic, elastic: es_settings()},
        ai: %{
          enabled: true,
          provider: :openai,
          openai: %{access_token: "key"},
          vector_store: %{
            enabled: true,
            store: :elastic,
            elastic: es_vector_settings(),
          },
        }
      )
      stack = insert(:stack, status: :successful)

      expect(Console.AI.VectorStore, :fetch, fn "aws vpc", [filters: [datatype: {:raw, :stack_state}], count: 3] ->
        {:ok, [
          %Console.AI.VectorStore.Response{
            type: :stack,
            stack_state: %Console.Schema.StackState.Mini{
              identifier: "1",
              resource: "resource",
              name: "name",
              configuration: %{"key" => "value"},
              links: %{"link" => "value"},
              stack: %{
                "id" => stack.id,
                "name" => stack.name,
                "repository" => %{"url" => stack.repository.url},
                "git" => %{"ref" => stack.git.ref, "folder" => stack.git.folder}
              }
            }
          }
        ]}
      end)

      {:ok, result} = Stack.implement(%Stack{query: "aws vpc"})
      {:ok, [parsed]} = Jason.decode(result)

      assert parsed["stack_id"] == stack.id
      assert parsed["stack_name"] == stack.name
      assert parsed["stack_url"] == Console.url("/stacks/#{stack.id}")
      assert parsed["git_repository_url"] == stack.repository.url
      assert parsed["git_ref"] == stack.git.ref
      assert parsed["stack_folder"] == stack.git.folder
    end
  end
end
