defmodule Console.Deployments.Flows.Preview do
  use Console.Services.Base
  alias Console.PubSub
  alias Console.Deployments.{Services, Git, Pr}
  alias Console.Services.Users
  alias Console.Schema.{
    PreviewEnvironmentInstance,
    PreviewEnvironmentTemplate,
    PullRequest,
    ServiceTemplate,
    Service,
    ScmConnection
  }

  @preview_comment Console.priv_file!("pr/preview_env.md.eex")
  @template_preloads ~w(template reference_service connection)a

  @spec preload_instance(PreviewEnvironmentInstance.t | [PreviewEnvironmentInstance.t]) :: PreviewEnvironmentInstance.t | [PreviewEnvironmentInstance.t]
  def preload_instance(inst_or_insts), do: Repo.preload(inst_or_insts, [:service, :pull_request, template: @template_preloads])

  def get_template(flow_id, name) do
    Repo.get_by(PreviewEnvironmentTemplate, flow_id: flow_id, name: name)
    |> Repo.preload(@template_preloads)
  end

  def get_instance(template_id, pr_id) do
    Repo.get_by(PreviewEnvironmentInstance, template_id: template_id, pull_request_id: pr_id)
    |> preload_instance()
  end

  def sync_instance(%PullRequest{preview: p, flow_id: flow_id} = pr) when is_binary(p) and is_binary(flow_id) do
    with %PreviewEnvironmentTemplate{} = template <- get_template(flow_id, p) do
      case get_instance(template.id, pr.id) do
        %PreviewEnvironmentInstance{} = inst -> update_instance(inst, pr)
        nil -> create_instance(template, pr)
      end
    else
      _ -> {:error, "no template not found"}
    end
  end
  def sync_instance(_), do: :ok

  def pr_comment(%PreviewEnvironmentInstance{} = inst) do
    with {:ok, id} <- post_comment(inst) do
      inst
      |> PreviewEnvironmentInstance.changeset(%{status: %{comment_id: id}})
      |> Repo.update()
    end
  end

  def fresh?(updated_at), do: Timex.after?(updated_at || Timex.now(), Timex.shift(Timex.now(), minutes: -1))

  def sync_service(%Service{deleted_at: nil} = svc) do
    case Repo.preload(svc, [:preview_instance, :preview_templates]) do
      %Service{preview_instance: %PreviewEnvironmentInstance{} = inst} ->
        post_comment(inst)
      %Service{preview_templates: [_ | _], id: id, updated_at: updated_at} ->
        if fresh?(updated_at) do
          PreviewEnvironmentInstance.for_service(id)
          |> PreviewEnvironmentInstance.preloaded()
          |> PreviewEnvironmentInstance.ordered(asc: :id)
          |> Repo.stream(method: :keyset)
          |> Console.throttle()
          |> Enum.each(&update_instance(&1, &1.pull_request))
        end
      _ -> :ok
    end
  end
  def sync_service(_), do: :ok

  defp post_comment(%PreviewEnvironmentInstance{} = inst) do
    %PreviewEnvironmentInstance{
      pull_request: %PullRequest{url: url, commit_sha: sha} = pr,
      service: svc,
      template: %PreviewEnvironmentTemplate{comment_template: msg} = tpl,
    } = inst = Repo.preload(inst, [:template, :pull_request, service: :cluster])

    with %ScmConnection{} = conn <- scm_connection(tpl),
         message = EEx.eval_string(@preview_comment, assigns: [
           url: Console.url("/cd/clusters/#{svc.cluster_id}/services/#{svc.id}/components"),
           comment_template: msg,
           service: svc,
           sha: sha,
           status_color: color(svc.status),
           status_emoji: emoji(svc.status),
           status_text: status(svc.status),
           logs_url: Console.url("/cd/clusters/#{svc.cluster_id}/services/#{svc.id}/logs"),
           flow_url: Console.url("/flows/#{tpl.flow_id}/services")
         ]),
         {:ok, message} <- render_liquid(message, liquid_context(pr, tpl)) do
      Console.nonce({:svc_review, svc.id}, message, fn ->
        Pr.Dispatcher.review(conn, %{pr | comment_id: Console.deep_get(inst, ~w(status comment_id)a)}, message)
      end, ttl: :timer.seconds(15))
    else
      _ -> {:error, "could not create review comment for pr: #{url}"}
    end
  end

  def delete_instance(%PullRequest{preview: p, flow_id: fid} = pr) when is_binary(p) and is_binary(fid) do
    with %PreviewEnvironmentTemplate{} = template <- get_template(fid, p),
         %PreviewEnvironmentInstance{} = inst <- get_instance(template.id, pr.id) do
      Services.delete_service(inst.service_id, bot())
    end
  end
  def delete_instance(_), do: :ok

  defp create_instance(
    %PreviewEnvironmentTemplate{reference_service: %Service{} = ref} = template,
    %PullRequest{} = pr
  ) do
    with {:ok, attrs} <- build_attributes(pr, template),
         {:ok, svc} <- Services.clone_service(attrs, ref.id, ref.cluster_id, bot()) do
      %PreviewEnvironmentInstance{}
      |> PreviewEnvironmentInstance.changeset(%{
        service_id:      svc.id,
        pull_request_id: pr.id,
        template_id:     template.id
      })
      |> Repo.insert()
      |> notify(:create)
    end
  end
  defp create_instance(_, _), do: :ok

  def update_instance(
    %PreviewEnvironmentInstance{template: %PreviewEnvironmentTemplate{} = tpl, service: %Service{} = svc} = inst,
    %PullRequest{} = pr
  ) do
    with {:ok, attrs} <- build_attributes(pr, tpl),
         {:ok, svc} <- Services.update_service(attrs, svc.id, bot()),
         _ <- notify({:ok, %{inst | service: svc}}, :update),
      do: {:ok, svc}
  end
  def update_instance(_, _), do: :ok

  defp build_attributes(%PullRequest{} = pr, %PreviewEnvironmentTemplate{reference_service: svc, template: tpl} = template) do
    ctx = liquid_context(pr, template)
    with {:ok, ns}   <- render_liquid(tpl.namespace || svc.namespace, ctx),
         {:ok, name} <- render_liquid(tpl.name || svc.name, ctx),
         {:ok, tpl}  <- template_helm_vals(svc,tpl, ctx) do
      ServiceTemplate.attributes(tpl, ns, name)
      |> drop_nils_recursive()
      |> ignore_empty_config() # do this to avoid wiping secrets present on clone
      |> ok()
    end
  end

  defp liquid_context(%PullRequest{commit_sha: sha, attributes: attrs} = pr, %PreviewEnvironmentTemplate{} = tpl) do
    Console.string_map(%{
      "commitSha" => sha,
      "pr" => Map.put(pr_attributes(pr, tpl), "attributes", attrs)
    })
  end

  defp pr_attributes(%PullRequest{url: url}, %PreviewEnvironmentTemplate{} = tpl) when is_binary(url) do
    with %ScmConnection{} = conn <- scm_connection(tpl),
         {:ok, attrs} <- Pr.Dispatcher.pr_info(conn, url) do
      attrs
    else
      _ -> %{}
    end
  end
  defp pr_attributes(_, _), do: %{}

  defp scm_connection(%PreviewEnvironmentTemplate{connection: %ScmConnection{} = conn}), do: conn
  defp scm_connection(_), do: Git.default_scm_connection()

  defp template_helm_vals(%Service{} = svc, %ServiceTemplate{helm: %{values: v}} = tpl, ctx) do
    with {:ok, svc_values}  <- safe_yaml(Console.deep_get(svc, ~w(helm values)a)),
         {:ok, tpl_values}  <- render_liquid(v, ctx),
         {:ok, new_values}  <- safe_yaml(tpl_values),
         {:ok, vals}        <- DeepMerge.deep_merge(svc_values, new_values) |> Jason.encode(),
      do: {:ok, put_in(tpl.helm.values, vals)}
  end
  defp template_helm_vals(_, %ServiceTemplate{} = tpl, _), do: {:ok, tpl}

  defp safe_yaml(val) when is_binary(val), do: YamlElixir.read_from_string(val)
  defp safe_yaml(nil), do: {:ok, %{}}

  defp render_liquid(template, ctx) when is_binary(template) do
    with {:parse, {:ok, tpl}} <- {:parse, Solid.parse(template)},
         {:render, {:ok, res, _}} <- {:render, Solid.render(tpl, ctx, strict_variables: false)} do
      {:ok, IO.iodata_to_binary(res)}
    else
      {:parse, {:error, %Solid.TemplateError{} = err}} -> {:error, Solid.TemplateError.message(err)}
      {:render, {:error, errs, _}} -> {:error, Enum.map(errs, &inspect/1) |> Enum.join(", ")}
    end
  end
  defp render_liquid(template, _), do: {:ok, template}

  defp ignore_empty_config(%{configuration: []} = attrs), do: Map.delete(attrs, :configuration)
  defp ignore_empty_config(attrs), do: attrs

  defp color(:healthy), do: :green
  defp color(:failed), do: :red
  defp color(_), do: :yellow

  defp emoji(:healthy), do: ":white_check_mark:"
  defp emoji(:failed), do: ":x:"
  defp emoji(_), do: ":wrench:"

  defp status(:healthy), do: "ready!"
  defp status(:failed), do: "failed to deploy (check Plural to see details)"
  defp status(_), do: "building..."

  defp bot(), do: %{Users.get_bot!("console") | roles: %{admin: true}}

  defp notify({:ok, %PreviewEnvironmentInstance{} = inst}, :create),
    do: handle_notify(PubSub.PreviewEnvironmentInstanceCreated, inst)
  defp notify({:ok, %PreviewEnvironmentInstance{} = inst}, :update),
    do: handle_notify(PubSub.PreviewEnvironmentInstanceUpdated, inst)
  defp notify(pass, _), do: pass

  defp drop_nils_recursive(%{__struct__: _} = struct) do
    Map.from_struct(struct)
    |> drop_nils_recursive()
  end

  defp drop_nils_recursive(%{} = map) do
    Enum.filter(map, &elem(&1, 1) != nil)
    |> Map.new(fn {k, v} -> {k, drop_nils_recursive(v)} end)
  end

  defp drop_nils_recursive(list) when is_list(list), do: Enum.map(list, &drop_nils_recursive/1)
  defp drop_nils_recursive(v), do: v
end
