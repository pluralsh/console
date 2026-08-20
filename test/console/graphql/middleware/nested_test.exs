defmodule Console.Graphql.Middleware.NestedTest do
  use ExUnit.Case, async: true

  alias Absinthe.Resolution
  alias Console.Graphql.Middleware.Nested

  test "enforce marks the resolution context" do
    resolution = Nested.call(%Resolution{context: %{}}, enforce: true)

    assert resolution.context.nested_enforce
  end

  test "check permits resolution without enforcement" do
    resolution = %Resolution{context: %{}}

    assert ^resolution = Nested.call(resolution, check: true, msg: "blocked")
  end

  test "check returns its message after enforcement" do
    resolution =
      %Resolution{context: %{nested_enforce: true}}
      |> Nested.call(check: true, msg: "blocked")

    assert ["blocked"] = resolution.errors
  end
end
