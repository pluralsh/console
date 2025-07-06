defmodule Console.AI.Tools.Agent.SearchTest do
  use Console.DataCase, async: false
  use Mimic
  alias Console.AI.Tools.Agent.Search
  alias Console.AI.Graph.{IndexableItem, Provider, Provider.Elastic}
  alias ElasticsearchUtils, as: ES

  describe "implement/1" do
    test "it can fetch catalogs" do
      deployment_settings(ai: %{
        enabled: true,
        graph: %{
          enabled: true,
          store: :elastic,
          elastic: ES.es_vector_settings(),
        },
        provider: :openai,
        openai: %{access_token: "key"}
      })
      index = Elastic.curr_index(ES.vector_index())
      ES.drop_index(index)
      user = insert(:user)

      expect(Console.AI.OpenAI, :embeddings, 4, fn _, text -> {:ok, [{text, ES.vector()}]} end)

      to_user = for i <- 1..3 do
        %IndexableItem{id: "#{i}", type: "aws_vpc", provider: "aws", document: "aws_vpc", links: [], attributes: %{}}
      end

      connection = insert(:cloud_connection, read_bindings: [%{user_id: user.id}])
      Provider.bulk_index(connection, to_user)

      ES.refresh(index)

      user = Console.Services.Rbac.preload(user)
      Console.AI.Tool.context(user: user, session: insert(:agent_session, connection: connection))
      {:ok, result} = Search.implement(%Search{query: "aws vpc"})
      {:ok, parsed} = Jason.decode(result)

      assert is_list(parsed)
      refute Enum.empty?(parsed)
    end
  end
end
