defmodule Console.GraphQl.Deployments.SentinelMutationsTest do
  use Console.DataCase, async: true

  describe "createSentinel" do
    test "it can create a sentinel" do
      {:ok, %{data: %{"createSentinel" => sentinel}}} = run_query("""
        mutation SentinelCreate($attributes: SentinelAttributes!) {
          createSentinel(attributes: $attributes) {
            id
            name
            description
          }
        }
      """, %{"attributes" => %{"name" => "test", "description" => "test"}}, %{current_user: admin_user()})

      assert sentinel["name"] == "test"
      assert sentinel["description"] == "test"
    end
  end

  describe "updateSentinel" do
    test "it can update a sentinel" do
      sentinel = insert(:sentinel)

      {:ok, %{data: %{"updateSentinel" => sentinel}}} = run_query("""
        mutation SentinelUpdate($id: ID!, $attributes: SentinelAttributes!) {
          updateSentinel(id: $id, attributes: $attributes) {
            id
            name
            description
          }
        }
      """, %{
        "id" => sentinel.id,
        "attributes" => %{"name" => "test", "description" => "test"}
      }, %{current_user: admin_user()})

      assert sentinel["name"] == "test"
      assert sentinel["description"] == "test"
    end
  end

  describe "deleteSentinel" do
    test "it can delete a sentinel" do
      sentinel = insert(:sentinel)

      {:ok, %{data: %{"deleteSentinel" => found}}} = run_query("""
        mutation SentinelDelete($id: ID!) {
          deleteSentinel(id: $id) {
            id
          }
        }
      """, %{"id" => sentinel.id}, %{current_user: admin_user()})

      assert found["id"] == sentinel.id
      refute refetch(sentinel)
    end
  end
end
