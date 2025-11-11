defprotocol Console.AI.Vector.Storable do
  @spec id(any) :: binary | nil
  def id(any)

  @spec content(any) :: binary | :ignore
  def content(any)

  @spec datatype(any) :: binary
  def datatype(any)

  @spec prompt(any) :: binary
  def prompt(any)
end

defimpl Console.AI.Vector.Storable, for: Any do
  def id(_), do: nil

  def content(_), do: :ignore

  def datatype(_), do: "any"

  def prompt(_), do: ""
end

defimpl Console.AI.Vector.Storable, for: Console.Deployments.Pr.File do
  alias Console.AI.Utils

  def id(_), do: nil

  def content(%@for{} = file) do
    """
    url: #{file.url}
    title: #{file.title}
    repo: #{file.repo}
    filename: #{file.filename}
    #{safe_content(file)}#{Utils.stopword()}
    #{file.patch}
    """
  end

  defp safe_content(%@for{contents: c}) when is_binary(c), do: "#{Utils.stopword()}\n#{c}\n"
  defp safe_content(_), do: ""

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

    #{full_contents(pr_file)}
    The git patch of the change is:

    ```
    #{pr_file.patch}
    ```
    """
  end

  defp full_contents(%@for{contents: c}) when is_binary(c) do
    """
    The full contents of the file is:

    ```
    #{c}
    ```

    """
  end
  defp full_contents(_), do: ""
end

defimpl Console.AI.Vector.Storable, for: Console.Schema.AlertResolution.Mini do
  alias Console.AI.Utils

  def id(%@for{alert_id: id}), do: id

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

defimpl Console.AI.Vector.Storable, for: Console.Schema.StackState.Mini do
  alias Console.AI.Utils
  alias Console.AI.Tools.Utils, as: TU

  def id(%@for{identifier: id, stack: %{id: stack_id}}), do: "#{stack_id}.#{id}"

  def content(%@for{} = mini) do
    base = base_content(mini)

    case TU.yaml_encode(mini.stack) do
      {:ok, yaml} ->
        """
        #{base}
        stack:
        #{TU.indent(yaml, 2)}
        """
      _ -> base
    end
  end

  defp base_content(%@for{} = mini) do
    """
    identifier: #{mini.identifier}
    resource: #{mini.resource}
    name: #{mini.name}
    configuration: #{mini.configuration}
    links: #{mini.links}
    """
  end

  def datatype(_), do: "stack_state"

  def prompt(%@for{}), do: ""
end

defimpl Console.AI.Vector.Storable, for: Console.Schema.ServiceComponent.Mini do
  alias Console.AI.Utils
  alias Console.AI.Tools.Utils, as: TU

  def id(%@for{service_id: id, group: g, kind: k, namespace: n, name: name, version: v}),
    do: "#{id}.#{g}.#{k}.#{n}.#{name}.#{v}"

  def content(%@for{} = mini) do
    base = base_content(mini)

    with {:ok, svc_yaml} <- TU.yaml_encode(mini.service) do
        """
        #{base}
        service:
        #{TU.indent(svc_yaml, 2)}
        """
    else
      _ -> base
    end
  end

  defp base_content(%@for{} = mini) do
    """
    service_id: #{mini.service_id}
    service_url: #{mini.service_url}
    group: #{mini.group}
    version: #{mini.version}
    kind: #{mini.kind}
    namespace: #{mini.namespace}
    name: #{mini.name}
    """
  end

  def datatype(_), do: "service_component"

  def prompt(%@for{}), do: ""
end

defimpl Console.AI.Vector.Storable, for: Console.Schema.PrAutomation.Mini do
  alias Console.AI.Utils

  def id(%@for{id: id}), do: id

  def content(%@for{} = mini) do
    """
    A Plural PR Autmoation to serve as an infrastructure provisioning golden path.  Its specification is below:

    Name: #{mini.name}
    Documentation: #{mini.documentation}
    Pull Request Title: #{mini.title}
    Pull Request Commit Message: #{mini.message}
    Pull Request Branch: #{mini.branch}
    Pull Request Branch Prefix: #{mini.branch_prefix}
    """
  end

  def datatype(_), do: "pr_automation"

  def prompt(%@for{}), do: ""
end

defimpl Console.AI.Vector.Storable, for: Console.Schema.Catalog.Mini do
  alias Console.AI.Utils

  def id(%@for{id: id}), do: id

  def content(%@for{} = mini) do
    """
    A Plural Catalog to serve as a collection of PR Automations.  Its specification is below:

    Name: #{mini.name}
    Description: #{mini.description}
    Category: #{mini.category}
    """
  end

  def datatype(_), do: "catalog"

  def prompt(%@for{}), do: ""
end
