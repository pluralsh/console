defprotocol Console.AI.Vector.Storable do
  @spec content(any) :: binary | :ignore
  def content(any)

  @spec datatype(any) :: binary
  def datatype(any)

  @spec prompt(any) :: binary
  def prompt(any)
end

defimpl Console.AI.Vector.Storable, for: Any do
  def content(_), do: :ignore

  def datatype(_), do: "any"

  def prompt(_), do: ""
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

  def prompt(%@for{} = pr_file) do
    """
    A file from a given pull request with information like so, containing a possible code change that caused the issue, described below:

    Pull Request URL: #{pr_file.url}
    Repo: #{pr_file.repo}
    PR Title: #{pr_file.title}
    Commit SHA: #{pr_file.sha}
    Filename: #{pr_file.filename}
    Base Branch: #{pr_file.base || "n/a"}
    Head Branch: #{pr_file.head || "n/a"}

    The full contents of the file is:

    ```
    #{pr_file.contents}
    ```

    The git patch of the change is:

    ```
    #{pr_file.patch}
    ```
    """
  end
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

  def prompt(%@for{} = res) do
    """
    A prior alert resolution with data like so that likely was caused by the same issue, with information below:

    Metadata:
      Title: #{res.title}
      Message: #{res.message}
      Severity: #{res.severity}

    And the logged resolution was:

    #{res.resolution}
    """
  end
end
