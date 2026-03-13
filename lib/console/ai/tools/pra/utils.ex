defmodule Console.AI.Tools.Pra.Utils do
  def relpath(dir, f) do
    case Path.safe_relative(f, dir) do
      {:ok, sanitized} -> {:ok, Path.join(dir, sanitized)}
      :error -> {:error, "unsafe file path #{f}"}
    end
  end
end
