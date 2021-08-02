defmodule Console.GraphQl.PluralMutationsTest do
  use Console.DataCase, async: true
  alias Console.Plural.Queries
  use Mimic

  describe "installRecipe" do
    test "a user can install a recipe" do
      get_body = Jason.encode!(%{
        query: Queries.get_recipe_query(),
        variables: %{id: "id"}
      })

      inst_body = Jason.encode!(%{
        query: Queries.install_recipe_mutation(),
        variables: %{id: "id", ctx: "{}"}
      })

      recipe = %{
        id: "id",
        name: "name",
        description: "description",
        repository: %{id: "id2", name: "repo"}
      }

      expect(HTTPoison, :post, 2, fn
        _, ^get_body, _ ->
          {:ok, %{body: Jason.encode!(%{data: %{recipe: recipe}})}}
        _, ^inst_body, _ ->
          {:ok, %{body: Jason.encode!(%{data: %{installRecipe: [%{id: "huh"}]}})}}
      end)

      user = insert(:user)

      {:ok, %{data: %{"installRecipe" => build}}} = run_query("""
        mutation Install($id: ID!, $context: Map!) {
          installRecipe(id: $id, context: $context) {
            id
            type
            creator { id }
          }
        }
      """, %{"id" => "id", "context" => Jason.encode!(%{"repo" => %{"some" => "val"}})}, %{current_user: user})

      assert build["type"] == "INSTALL"
      assert build["creator"]["id"] == user.id
    end
  end
end
