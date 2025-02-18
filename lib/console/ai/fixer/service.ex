defmodule Console.AI.Fixer.Service do
  @behaviour Console.AI.Fixer
  use Console.AI.Evidence.Base
  import Console.AI.Fixer.Base
  alias Console.Repo
  alias Console.AI.Fixer.Parent
  alias Console.Schema.{Service, GitRepository, Cluster}
  alias Console.Deployments.{Services}

  def prompt(%Service{} = svc, insight) do
    svc = Repo.preload(svc, [:cluster, :repository, :parent, owner: :parent])
    with {:ok, f} <- Services.tarstream(svc),
         {:ok, code} <- svc_code_prompt(f, svc) do
      Enum.concat([
        {:user, """
          We've found the following insight about a Plural service that is currently in #{svc.status} state:

          #{insight}

          We'd like you to suggest a simple code or configuration change that can fix the issues identified in that insight.
          I'll do my best to list all the needed resources below.  Additional useful context is that Plural templates any file with a `.liquid` extension with the metadata of the cluster, or secrets attached to the service itself.
        """},
        {:user, svc_details(svc)} | code
      ], Parent.parent_prompt(
        svc,
        child: "#{svc.name} service",
        cr: "ServiceDeployment",
        cr_additional: " specifying the name #{svc.name} and namespace #{svc.namespace}"
      ))
      |> ok()
    end
  end

  def svc_details(%Service{cluster: %Cluster{name: n, handle: h, distro: d}} = svc) do
    """
    The service is being deployed to the #{distro(d)} kubernetes cluster named #{n} with a Plural cluster handle #{h}.  In addition, I can list high level details
    about how its manifests are configured and sourced:

    #{compress_and_join([git_details(svc), helm_details(svc)])}
    """
  end

  def helm_details(%Service{helm: %Service.Helm{} = h}) do
    """
    The service uses helm-specific configuration as follows:

    #{compress_and_join([
      (if h.chart, do: "chart: #{h.chart}", else: nil),
      (if h.version, do: "version: #{h.version}", else: nil),
      (if h.release, do: "release: #{h.release}", else: nil),
      (if h.values, do: "helm values overrides:\n#{h.values}", else: nil),
      (if is_list(h.values_files) && !Enum.empty?(h.values_files), do: "values files: #{Enum.join(h.values_files, ",")}", else: nil)
    ])}

    Changes to helm charts should be focused on dedicated values files or values overrides. You should *always* prefer
    to make changes in the custom values file already configured, but if none is relevant, simply add the customized values
    as the `spec.helm.values` field, which supports any unstructured map type, of the associated ServiceDeployment kubernetes custom resource for this service.
    """
  end
  def helm_details(_), do: nil

  def git_details(%Service{git: %Service.Git{ref: ref, folder: f}, repository: %GitRepository{url: url}}) do
    """
    The service sources manifests from a Git repository hosted at url: #{url}, present at the git reference #{ref} and folder #{f}
    """
  end
  def git_details(_), do: nil
end
