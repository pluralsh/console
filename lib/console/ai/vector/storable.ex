defprotocol Console.AI.Vector.Storable do
  @spec content(any) :: binary | :ignore
  def content(any)

  @spec datatype(any) :: binary
  def datatype(any)
end

defimpl Console.AI.Vector.Storable, for: Any do
  def content(_), do: :ignore

  def datatype(_), do: "any"
end

defimpl Console.AI.Vector.Storable, for: Console.Deployments.Pr.File do
  alias Console.AI.Utils

  def content(%@for{} = file) do
    """
    url: #{file.url}
    title: #{file.title}
    repo: #{file.repo}
    filename: #{file.filename}
    #{Utils.stopword()}
    #{file.contents}
    #{Utils.stopword()}
    #{file.patch}
    """
  end

  def datatype(_), do: "pr_file"
end

defimpl Console.AI.Vector.Storable, for: Console.Schema.AlertResolution.Mini do
  alias Console.AI.Utils

  def content(%@for{} = mini) do
    """
    title: #{mini.title}
    summary: #{mini.message}
    provider: #{mini.type}
    severity: #{mini.severity}
    #{Utils.stopword()}
    #{mini.resolution}
    """
  end

  def datatype(_), do: "alert_resolution"
end
