defmodule Console.Plural.Users do
  use Console.Plural.Base
  alias Console.Plural.{User}

  defmodule Query, do: defstruct [:me]

  def me() do
    me_query()
    |> Client.run(%{}, %Query{me: %User{}})
    |> when_ok(fn %{me: me} -> me end)
  end
end
