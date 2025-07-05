defmodule Console.AI.Graph.Provider.ElasticTest do
  use Console.DataCase, async: false
  use Mimic
  alias Console.AI.Graph.{Provider.Elastic, Provider}
  alias Console.AI.Graph.IndexableItem
  alias ElasticsearchUtils, as: ES

  describe "#fetch/3" do
    test "it can fetch items" do
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
      %{group: group} = insert(:group_member, user: user)

      expect(Console.AI.OpenAI, :embeddings, 11, fn _, text -> {:ok, [{text, ES.vector()}]} end)


      to_user = for i <- 1..3 do
        %IndexableItem{id: "#{i}", type: "aws_vpc", provider: "aws", document: "aws_vpc", links: [], attributes: %{}}
      end

      Provider.bulk_index(insert(:cloud_connection, read_bindings: [%{user_id: user.id}]), to_user)

      to_group = for i <- 4..6 do
        %IndexableItem{id: "#{i}", type: "aws_vpc", provider: "aws", document: "aws_vpc", links: [], attributes: %{}}
      end

      Provider.bulk_index(insert(:cloud_connection, read_bindings: [%{group_id: group.id}]), to_group)


      avoid = for i <- 7..10 do
        %IndexableItem{id: "#{i}", type: "aws_vpc", provider: "aws", document: "aws_vpc", links: [], attributes: %{}}
      end

      Provider.bulk_index(insert(:cloud_connection), avoid)

      ES.refresh(index)


      user = Console.Services.Rbac.preload(user)
      {:ok, res} = Provider.fetch("aws_vpc", user, count: 10)

      refute Enum.empty?(res)
      refute Enum.any?(res, fn %IndexableItem{id: id} -> id in Enum.map(7..10, & "#{&1}") end)
    end
  end


  describe "bulk_index/3" do
    test "it can bulk index items" do
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
      conn = insert(:cloud_connection)

      expect(Console.AI.OpenAI, :embeddings, 10, fn _, text -> {:ok, [{text, ES.vector()}]} end)

      items = for i <- 1..10 do
        %IndexableItem{id: "#{i}", type: "aws_vpc", provider: "aws", document: "aws_vpc", links: [], attributes: %{}}
      end

      Provider.bulk_index(conn, items)

      ES.refresh(index)

      {:ok, c} = ES.count_index(index)
      assert c > 0
    end
  end
end
