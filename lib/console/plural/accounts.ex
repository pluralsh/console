defmodule Console.Plural.Accounts do
  use Console.Plural.Base
  alias Console.Plural.Account

  defmodule Query, do: defstruct [:account]

  def account() do
    account_query()
    |> Client.run(%{}, %Query{account: Account.spec()})
    |> when_ok(fn %{account: result} -> result end)
  end
end
