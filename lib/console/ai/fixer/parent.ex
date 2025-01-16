defmodule Console.AI.Fixer.Parent do
  use Console.AI.Evidence.Base
  import Console.AI.Fixer.Base
  alias Console.AI.Fixer.Service, as: SvcFixer
  alias Console.Deployments.{Services}
  alias Console.Schema.{Service, GlobalService, Stack, ServiceTemplate}

  def parent_prompt(%Stack{parent: %Service{} = svc}, info), do: do_parent_prompt(svc, info)
  def parent_prompt(%Service{parent: %Service{} = svc}, info), do: do_parent_prompt(svc, info)
  def parent_prompt(%Service{owner: %GlobalService{parent: %Service{}} = global}, info),
    do: do_parent_prompt(global, info)
  def parent_prompt(_, _), do: []

  defp do_parent_prompt(%Service{} = svc, info) do
    svc = Console.Repo.preload(svc, [:cluster, :repository, :parent])
    with {:ok, f} <- Services.tarstream(svc),
         {:ok, code} <- svc_code_prompt(f, svc) do
      [
        {:user, """
        The #{info[:child]} is being instantiated using a Plural service-of-services structure, and will be represented as a #{info[:cr]} kubernetes
        custom resource#{info[:cr_additional] || ""}.  It is possible this is where the fix needs to happen, especially in the wiring of helm values or
        terraform variables.

        I will do my best to describe the service itself and show you the manifests that's defining that service below:
        """},
        {:user, SvcFixer.svc_details(svc)} | code
      ]
    else
      _ -> []
    end
  end

  defp do_parent_prompt(%GlobalService{} = global, info) do
    %{parent: svc} = global = Console.Repo.preload(global, [:project, :service, :template, parent: [:cluster, :repository, :parent]])
    with {:ok, f} <- Services.tarstream(svc),
         {:ok, code} <- svc_code_prompt(f, svc) do
      [
        {:user, """
        The #{info[:child]} is being instantiated by a GlobalService named #{global.name} which is itself defined using a Plural service-of-services structure,
        and will be represented as a GlobalService kubernetes custom resource.  It is possible this is where the fix needs to happen, especially in the wiring of helm values.

        I will do my best to describe the global service itself and show you the manifests that's defining that global service below:
        """},
        {:user, global_details(global)} | code
      ]
    else
      _ -> []
    end
  end

  defp do_parent_prompt(_, _), do: []

  defp global_details(%GlobalService{} = global) do
    """
    The global service has name #{global.name}.  It will define services on a set of targeted clusters using precise replication rules.

    #{targeting(global)}

    #{global_source(global)}
    """
  end

  defp global_source(%GlobalService{service: %Service{name: name}}) do
    """
    The global service operates by cloning the #{name} service on each targeted cluster.
    It's possible cluster metadata will dynamically template yaml from there to customize per cluster
    """
  end

  defp global_source(%GlobalService{template: %ServiceTemplate{} = template}) do
    """
    The global service defines new services using the service template with json spec below:\n

    #{Jason.encode!(Console.mapify(template))}
    """
  end

  defp global_source(_), do: ""

  defp targeting(%GlobalService{} = global) do
    """
    The global service replicates the service onto clusters matching the following criteria:

    #{compress_and_join([
      (if global.distro, do: "* matches kubernetes distribution: #{global.distro}", else: nil),
      (if global.project, do: "* is a cluster within the project: #{global.project.name}", else: nil),
      (if is_list(global.tags) and !Enum.empty?(global.tags),
        do: "* matches clusters with tags: #{Enum.map(global.tags, &"#{&1.name}=#{&1.value}") |> Enum.join(",")}",
        else: nil)
    ])}
    """
  end
end
