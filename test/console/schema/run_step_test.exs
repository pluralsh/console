defmodule Console.Schema.RunStepTest do
  use Console.DataCase, async: true

  describe "args column length" do
    test "limits each string element to 2048, not the array as a whole" do
      %{rows: [[type]]} =
        Repo.query!("""
        SELECT format_type(a.atttypid, a.atttypmod)
        FROM pg_attribute a
        JOIN pg_class c ON a.attrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public'
          AND c.relname = 'run_steps'
          AND a.attname = 'args'
        """)

      assert type == "character varying(2048)[]"

      long_arg = String.duplicate("a", 300)
      step = insert(:run_step, args: ["import", "addr", long_arg])
      assert String.length(Enum.at(step.args, 2)) == 300

      many_args = Enum.map(1..10, fn _ -> String.duplicate("b", 300) end)
      assert Enum.sum(Enum.map(many_args, &String.length/1)) > 2048

      step = insert(:run_step, args: many_args)
      assert length(step.args) == 10

      assert_raise Postgrex.Error, ~r/value too long for type character varying\(2048\)/, fn ->
        insert(:run_step, args: [String.duplicate("c", 2049)])
      end
    end
  end
end
