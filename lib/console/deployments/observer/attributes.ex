defprotocol Console.Deployments.Observer.Attributes do
  @fallback_to_any true
  @doc """
  Replace the value in the attributes with the given key and value
  """
  def attrs(schema)
end

defimpl Console.Deployments.Observer.Attributes, for: Any do
  def attrs(_), do: %{}
end

defimpl Console.Deployments.Observer.Attributes, for: Console.Deployments.Compatibilities.CloudAddOn.Version do
 def attrs(%@for{version: vsn}), do: %{version: vsn}
end

defimpl Console.Deployments.Observer.Attributes, for: Console.Deployments.Compatibilities.Version do
  def attrs(%@for{version: vsn, chart_version: cvs, images: images}),
    do: %{version: vsn, chart_version: cvs, images: images}
end
