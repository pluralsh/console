defmodule Console.AI.Vector.Content do
  alias Console.AI.Vector.Storable
  alias Console.Deployments.Pr.File

  def content(data), do: {Storable.datatype(data), Storable.content(data)}

  def decode("pr_file", data), do: %{pr_file: File.new(data)}
  def decode(:pr_file, data), do: %{pr_file: File.new(data)}
end
