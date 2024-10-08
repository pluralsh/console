defmodule Console.Plural.Accounts do
  use Console.Plural.Base
  alias Console.Plural.{Account, OIDCProvider}

  defmodule Query, do: defstruct [:account, :helpQuestion]

  defmodule Mutation, do: defstruct [:createOidcProvider, :updateOidcProvider, :deleteOidcProvider]

  def account() do
    account_query()
    |> Client.run(%{}, %Query{account: Account.spec()})
    |> when_ok(fn %Query{account: result} -> result end)
  end

  def ai(prompt) do
    ai_query()
    |> Client.run(%{prompt: prompt}, %Query{})
    |> when_ok(& &1.helpQuestion)
  end

  def create_oidc_provider(attrs) do
    create_oidc_provider()
    |> Client.run(%{attributes: attrs}, %Mutation{createOidcProvider: OIDCProvider.spec()})
    |> when_ok(& &1.createOidcProvider)
  end

  def update_oidc_provider(id, attrs) do
    update_oidc_provider()
    |> Client.run(%{id: id, attributes: attrs}, %Mutation{updateOidcProvider: OIDCProvider.spec()})
    |> when_ok(& &1.updateOidcProvider)
  end

  def delete_oidc_provider(id) do
    delete_oidc_provider()
    |> Client.run(%{id: id}, %Mutation{deleteOidcProvider: OIDCProvider.spec()})
    |> when_ok(& &1.deleteOidcProvider)
  end
end
