defmodule Console.SecretKeyBaseTest do
  use ExUnit.Case, async: true

  describe "secret_key_base/2" do
    test "it prefers an explicit SECRET_KEY_BASE" do
      base = String.duplicate("a", 64)
      assert Console.secret_key_base(base, "jwt") == base
    end

    test "it rejects short secret key bases" do
      assert_raise ArgumentError, fn -> Console.secret_key_base("short", "jwt") end
    end

    test "it derives a stable, install-specific key from the jwt secret" do
      derived = Console.secret_key_base(nil, "jwt-one")

      assert byte_size(derived) >= 64
      assert Console.secret_key_base("", "jwt-one") == derived
      refute Console.secret_key_base(nil, "jwt-two") == derived
      refute derived == Application.get_env(:console, ConsoleWeb.Endpoint)[:secret_key_base]
      refute derived =~ "jwt-one"
    end

    test "it refuses to fall back to a default" do
      assert_raise ArgumentError, fn -> Console.secret_key_base(nil, nil) end
    end
  end
end
