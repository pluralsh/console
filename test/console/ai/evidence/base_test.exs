defmodule Console.AI.Evidence.BaseTest do
  use ExUnit.Case, async: true
  import Console.AI.Evidence.Base

  describe "not_found?/1" do
    test "returns true for HTTPoison.Response with 404 status" do
      error = {:error, %HTTPoison.Response{status_code: 404, body: "Not Found"}}
      assert not_found?(error) == true
    end

    test "returns true for generic map with 404 status_code" do
      error = {:error, %{status_code: 404}}
      assert not_found?(error) == true
    end

    test "returns false for non-404 HTTPoison.Response" do
      error = {:error, %HTTPoison.Response{status_code: 500, body: "Internal Server Error"}}
      assert not_found?(error) == false
    end

    test "returns false for success tuples" do
      assert not_found?({:ok, %{}}) == false
    end

    test "returns false for other error types" do
      assert not_found?({:error, :timeout}) == false
      assert not_found?({:error, "some error"}) == false
    end
  end
end
