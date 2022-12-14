defmodule Console.Services.PluralTest do
  use Console.DataCase, async: false
  use Mimic
  alias Console.Services.Plural
  alias Console.Plural.{Queries, Manifest, Context}
  alias Console.Commands.Command

  setup :set_mimic_global

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

  describe "#install_recipe/4" do
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
      {:ok, build} = Plural.install_recipe(
        "id",
        %{"repo" => %{"some" => "value"}},
        false,
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

    test "a user can enable oidc after installation" do
      get_body = Jason.encode!(%{
        query: Queries.get_recipe_query(),
        variables: %{id: "id"}
      })

      inst_body = Jason.encode!(%{
        query: Queries.install_recipe_mutation(),
        variables: %{id: "id", ctx: "{}"}
      })

      me_body = Jason.encode!(%{
        query: Queries.me_query(),
        variables: %{}
      })

      get_inst_body = Jason.encode!(%{
        query: Queries.get_installation_query(),
        variables: %{name: "repo"}
      })

      oidc_body = Jason.encode!(%{
        query: Queries.upsert_oidc_provider(),
        variables: %{id: "instid", attributes: %{
          redirectUris: ["https://domain.com/oauth"],
          bindings: [%{userId: "me"}],
          authMethod: "POST"
        }}
      })

      recipe = %{
        id: "id",
        name: "name",
        description: "description",
        oidcSettings: %{authMethod: "POST", uriFormat: "https://{domain}/oauth", domainKey: "domain"},
        repository: %{id: "id2", name: "repo"}
      }

      expect(HTTPoison, :post, 5, fn
        _, ^get_body, _ ->
          {:ok, %{body: Jason.encode!(%{data: %{recipe: recipe}})}}
        _, ^me_body, _ -> {:ok, %{body: Jason.encode!(%{data: %{me: %{id: "me"}}})}}
        _, ^get_inst_body, _ ->
          {:ok, %{body: Jason.encode!(%{data: %{installation: %{id: "instid"}}})}}
        _, ^oidc_body, _ ->
          {:ok, %{body: Jason.encode!(%{data: %{upsertOidcProvider: %{id: "id"}}})}}
        _, ^inst_body, _ ->
          {:ok, %{body: Jason.encode!(%{data: %{installRecipe: [%{id: "huh"}]}})}}
      end)

      expect(Manifest, :get, fn ->
        {:ok, %Manifest{network: %Manifest.Network{subdomain: "some.domain.co"}}}
      end)

      user = insert(:user)
      {:ok, build} = Plural.install_recipe(
        "id",
        %{"repo" => %{"domain" => "domain.com"}},
        true,
        user
      )

      assert build.type == :install
      assert build.message == "Installed bundle name for repository repo"
      assert build.context == %{
        configuration: %{"repo" => %{"domain" => "domain.com"}},
        bundle: %{repository: "repo", name: "name"}
      }
      assert build.creator_id == user.id
    end

    test "a user can enable oidc with subdomain configuration" do
      get_body = Jason.encode!(%{
        query: Queries.get_recipe_query(),
        variables: %{id: "id"}
      })

      inst_body = Jason.encode!(%{
        query: Queries.install_recipe_mutation(),
        variables: %{id: "id", ctx: "{}"}
      })

      me_body = Jason.encode!(%{
        query: Queries.me_query(),
        variables: %{}
      })

      get_inst_body = Jason.encode!(%{
        query: Queries.get_installation_query(),
        variables: %{name: "repo"}
      })

      oidc_body = Jason.encode!(%{
        query: Queries.upsert_oidc_provider(),
        variables: %{id: "instid", attributes: %{
          redirectUris: ["https://domain.com/oauth"],
          bindings: [%{userId: "me"}],
          authMethod: "POST"
        }}
      })

      recipe = %{
        id: "id",
        name: "name",
        description: "description",
        oidcSettings: %{authMethod: "POST", uriFormat: "https://{subdomain}/oauth", subdomain: true},
        repository: %{id: "id2", name: "repo"}
      }

      expect(HTTPoison, :post, 5, fn
        _, ^get_body, _ ->
          {:ok, %{body: Jason.encode!(%{data: %{recipe: recipe}})}}
        _, ^me_body, _ -> {:ok, %{body: Jason.encode!(%{data: %{me: %{id: "me"}}})}}
        _, ^get_inst_body, _ ->
          {:ok, %{body: Jason.encode!(%{data: %{installation: %{id: "instid"}}})}}
        _, ^oidc_body, _ ->
          {:ok, %{body: Jason.encode!(%{data: %{upsertOidcProvider: %{id: "id"}}})}}
        _, ^inst_body, _ ->
          {:ok, %{body: Jason.encode!(%{data: %{installRecipe: [%{id: "huh"}]}})}}
      end)

      expect(Manifest, :get, fn ->
        {:ok, %Manifest{network: %Manifest.Network{subdomain: "domain.com"}}}
      end)

      user = insert(:user)
      {:ok, build} = Plural.install_recipe(
        "id",
        %{"repo" => %{"example" => "key"}},
        true,
        user
      )

      assert build.type == :install
      assert build.message == "Installed bundle name for repository repo"
      assert build.context == %{
        configuration: %{"repo" => %{"example" => "key"}},
        bundle: %{repository: "repo", name: "name"}
      }
      assert build.creator_id == user.id
    end
  end

  describe "#install_stack/4" do
    test "a user can enable oidc after installation" do
      inst_body = Jason.encode!(%{
        query: Queries.install_stack_mutation(),
        variables: %{name: "id", provider: "AWS"}
      })

      me_body = Jason.encode!(%{
        query: Queries.me_query(),
        variables: %{}
      })

      get_inst_body = Jason.encode!(%{
        query: Queries.get_installation_query(),
        variables: %{name: "repo"}
      })

      oidc_body = Jason.encode!(%{
        query: Queries.upsert_oidc_provider(),
        variables: %{id: "instid", attributes: %{
          redirectUris: ["https://domain.com/oauth"],
          bindings: [%{userId: "me"}],
          authMethod: "POST"
        }}
      })

      recipe = %{
        id: "id",
        name: "name",
        description: "description",
        oidcSettings: %{authMethod: "POST", uriFormat: "https://{domain}/oauth", domainKey: "domain"},
        repository: %{id: "id2", name: "repo"}
      }

      expect(HTTPoison, :post, 4, fn
        _, ^me_body, _ -> {:ok, %{body: Jason.encode!(%{data: %{me: %{id: "me"}}})}}
        _, ^get_inst_body, _ ->
          {:ok, %{body: Jason.encode!(%{data: %{installation: %{id: "instid"}}})}}
        _, ^oidc_body, _ ->
          {:ok, %{body: Jason.encode!(%{data: %{upsertOidcProvider: %{id: "id"}}})}}
        _, ^inst_body, _ ->
          {:ok, %{body: Jason.encode!(%{data: %{installStack: [recipe]}})}}
      end)

      expect(Manifest, :get, fn ->
        {:ok, %Manifest{network: %Manifest.Network{subdomain: "some.domain.co"}}}
      end)

      user = insert(:user)
      {:ok, build} = Plural.install_stack(
        "id",
        %{"repo" => %{"domain" => "domain.com"}},
        true,
        user
      )

      assert build.type == :install
      assert build.context == %{
        configuration: %{"repo" => %{"domain" => "domain.com"}},
        bundles: [%{repository: "repo", name: "name"}]
      }
      assert build.creator_id == user.id
    end
  end

  describe "#update_smtp/1" do
    test "it can update the smtp section of a wkspace's context" do
      context = %Context{
        bundles: [],
        configuration: %{"repo" => %{"value" => 1}}
      }

      expect(Context, :get, fn -> {:ok, context} end)
      expect(Context, :write, fn %Context{smtp: %{service: "smtp.service.com"}} = ctx -> {:ok, ctx} end)

      me = self()
      echo = fn val ->
        send me, val
        {:ok, val}
      end
      expect(Command, :cmd, 5, fn
        "git", ["reset", "--hard", "origin/master"], _ -> echo.(:reset)
        "git", ["clean", "-f"], _ -> echo.(:clean)
        "git", ["add", "."], _ -> echo.(:add)
        "git", ["commit", "-m", _], _ -> echo.(:commit)
        "git", ["push"], _ -> echo.(:push)
      end)

      {:ok, _} = Plural.update_smtp(%{service: "smtp.service.com"})

      assert_receive :reset
      assert_receive :clean
      assert_receive :add
      assert_receive :commit
      assert_receive :push
    end
  end
end
