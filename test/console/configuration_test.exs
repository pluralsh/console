defmodule Console.Commands.ConfigurationTest do
  use ExUnit.Case

  describe "#run/0" do
    test "It will cp ssh keys" do
      :ok = Console.Commands.Configuration.run()
    end
  end
end
