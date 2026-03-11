defmodule Console.AI.Tools.Pra.Utils do
  def relpath(dir, f) do
    with {:ok, sanitized} <- Path.safe_relative(f, dir),
      do: {:ok, Path.join(dir, sanitized)}
  end
end
