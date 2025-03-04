defmodule Console.AI.Vector.Content do
  alias Console.AI.Vector.Storable
  alias Console.AI.VectorStore.Response
  alias Console.Deployments.Pr.File
  alias Console.Schema.AlertResolution

  def content(data), do: {Storable.datatype(data), Storable.content(data)}

  def decode("pr_file", data), do: %Response{type: :pr, pr_file: File.new(data)}
  def decode(:pr_file, data), do: %Response{type: :pr, pr_file: File.new(data)}

  def decode("alert_resolution", data), do: %Response{type: :alert,alert_resolution: AlertResolution.Mini.new(data)}
  def decode(:alert_resolution, data), do: %Response{type: :alert, alert_resolution: AlertResolution.Mini.new(data)}

  def decode(_, _), do: nil
end
