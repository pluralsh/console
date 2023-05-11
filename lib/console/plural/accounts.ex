defmodule Console.Plural.Accounts do
  use Console.Plural.Base
  alias Console.Plural.Account

  defmodule Query, do: defstruct [:account, :helpQuestion]

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
end
