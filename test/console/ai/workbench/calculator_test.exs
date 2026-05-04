defmodule Console.AI.Workbench.CalculatorTest do
  use ExUnit.Case, async: true

  alias Console.AI.Workbench.Calculator

  describe "evaluate/1" do
    test "evaluates literals as floats" do
      assert {:ok, 42.0} = Calculator.evaluate("42")
      assert {:ok, 3.14} = Calculator.evaluate("3.14")
    end

    test "respects operator precedence" do
      assert {:ok, 14.0} = Calculator.evaluate("2 + 3 * 4")
      assert {:ok, 10.0} = Calculator.evaluate("2 * 3 + 4")
      assert {:ok, 50.0} = Calculator.evaluate("2 + 3 * 4 ^ 2")
    end

    test "respects parentheses" do
      assert {:ok, 20.0} = Calculator.evaluate("(2 + 3) * 4")
      assert {:ok, 2.5} = Calculator.evaluate("10 / (3 + 1)")
    end

    test "supports unary signs" do
      assert {:ok, -5.0} = Calculator.evaluate("-5")
      assert {:ok, -1.0} = Calculator.evaluate("-(2 - 1)")
      assert {:ok, 7.0} = Calculator.evaluate("+7")
    end

    test "supports scientific notation" do
      assert {:ok, 1000.0} = Calculator.evaluate("1e3")
      assert {:ok, 1.2} = Calculator.evaluate("12e-1")
      assert {:ok, 1500.0} = Calculator.evaluate("1.5e3")
    end

    test "supports exponentiation as right-associative" do
      assert {:ok, 8.0} = Calculator.evaluate("2 ^ 3")
      assert {:ok, 512.0} = Calculator.evaluate("2 ^ 3 ^ 2")
    end

    test "applies exponentiation before unary minus" do
      assert {:ok, -4.0} = Calculator.evaluate("-2 ^ 2")
      assert {:ok, 4.0} = Calculator.evaluate("(-2) ^ 2")
    end

    test "returns an error for malformed expressions" do
      assert {:error, error} = Calculator.evaluate("2 + * 3")
      assert error =~ "parse error"
    end

    test "returns an error for unsupported characters" do
      assert {:error, error} = Calculator.evaluate("2 + foo")
      assert error =~ "lex error"
    end

    test "returns an error for division by zero" do
      assert {:error, "division by zero"} = Calculator.evaluate("10 / (7 - 7)")
    end
  end

  describe "parse/1 and interpret/1" do
    test "parses to an ast and interprets it" do
      assert {:ok, ast} = Calculator.parse("8 - 3 * 2")
      assert {:ok, 2.0} = Calculator.interpret(ast)
    end
  end
end
