defmodule Console.Services.PluralTest do
  use Console.DataCase, async: true
  use Mimic
  alias Console.Services.Plural
  alias Console.Plural.Queries

  describe "update_configuration/2" do
    @tag :skip
    test "it can update configuration in a Plural repo" do
      repo = "repo"
      expected_path = Path.join([Console.workspace(), repo, "helm", repo, "values.yaml"])
      expect(File, :write, fn ^expected_path, _ -> :ok end)

      {:ok, _} = Plural.update_configuration(repo, "updated: yaml", :helm)
    end

    @tag :skip
    test "It will fail on invalid yaml" do
      repo = "repo"
      {:error, _} = Plural.update_configuration(repo, "- key:", :helm)
    end
  end

  describe "#install_recipe/3" do
    test "a user can install a recipe" do
      get_body = Jason.encode!(%{
        query: Queries.get_recipe_query(),
        variables: %{id: "id"}
      })

      inst_body = Jason.encode!(%{
        query: Queries.install_recipe_mutation(),
        variables: %{id: "id", ctx: %{}}
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
      {:ok, build} = Plural.install_recipe(
        "id",
        %{"repo" => %{"some" => "value"}},
        user
      )

      assert build.type == :install
      assert build.message == "Installed bundle name for repository repo"
      assert build.context == %{
        configuration: %{"repo" => %{"some" => "value"}},
        bundle: %{repository: "repo", name: "name"}
      }
      assert build.creator_id == user.id
    end
  end
end
