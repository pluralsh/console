defmodule Console.Schema.Observer do
  use Piazza.Ecto.Schema
  alias Console.Schema.{Project, OCIAuth, HelmRepository, ServiceError}

  defenum Action,        pipeline: 0, pr: 1
  defenum Status,        healthy: 0, failed: 1
  defenum TargetType,    oci: 0, helm: 1, git: 2
  defenum GitTargetType, tags: 0
  defenum TargetOrder,   semver: 0, latest: 1

  schema "observers" do
    field :name,           :string
    field :status,         Status, default: :healthy
    field :last_value,     :string
    field :crontab,        :string
    field :last_run_at,    :utc_datetime_usec
    field :next_run_at,    :utc_datetime_usec

    field :initial, :string, virtual: true

    embeds_one :target, Target, on_replace: :update do
      field :type,   TargetType, default: :oci
      field :format, :string
      field :order,  TargetOrder, default: :semver

      embeds_one :git, GitTarget, on_replace: :update do
        field :type,          GitTargetType, default: :tags
        field :repository_id, :binary_id
      end

      embeds_one :oci, OCITarget, on_replace: :update do
        field :url,       :string
        field :provider,  HelmRepository.Provider
        embeds_one :auth, OCIAuth, on_replace: :update
      end

      embeds_one :helm, HelmTarget, on_replace: :update do
        field :url,       :string
        field :chart,     :string
        field :provider,  HelmRepository.Provider
        embeds_one :auth, OCIAuth, on_replace: :update
      end
    end

    embeds_many :actions, ObserverAction, on_replace: :delete do
      field :type, Action, default: :pipeline

      embeds_one :configuration, Configuration, on_replace: :update do
        embeds_one :pr, PrAction, on_replace: :update do
          field :automation_id,   :binary_id
          field :repository,      :string
          field :branch_template, :string
          field :context,         :map
        end

        embeds_one :pipeline, PipelineAction, on_replace: :update do
          field :pipeline_id, :binary_id
          field :context,     :map
        end
      end
    end

    belongs_to :project, Project
    has_many   :errors,  ServiceError, on_replace: :delete

    timestamps()
  end

  def for_project(query \\ __MODULE__, proj_id) do
    from(o in query, where: o.project_id == ^proj_id)
  end

  def runnable(query \\ __MODULE__) do
    now = Timex.now()
    from(o in query, where: o.next_run_at < ^now)
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :name]) do
    from(o in query, order_by: ^order)
  end

  @valid ~w(name status project_id last_value crontab last_run_at next_run_at initial)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_assoc(:errors)
    |> cast_embed(:target, with: &target_changeset/2)
    |> cast_embed(:actions, with: &action_changeset/2, required: true)
    |> foreign_key_constraint(:project_id)
    |> put_new_change(:last_run_at, &Timex.now/0)
    |> set_initial()
    |> determine_next_run()
    |> validate_required(~w(name target crontab last_run_at next_run_at)a)
  end

  defp target_changeset(model, attrs) do
    model
    |> cast(mv_target(attrs), [:type, :format, :order])
    |> cast_embed(:oci, with: &oci_changeset/2)
    |> cast_embed(:helm, with: &helm_changeset/2)
    |> cast_embed(:git, with: &git_changeset/2)
    |> validate_required([:type, :order])
  end

  defp set_initial(cs), do: put_new_change(cs, :last_value, fn -> get_field(cs, :initial) end)

  defp mv_target(%{type: _} = attrs), do: attrs
  defp mv_target(%{target: t} = attrs), do: Map.put(attrs, :type, t)
  defp mv_target(attrs), do: attrs

  defp action_changeset(model, attrs) do
    model
    |> cast(attrs, [:type])
    |> cast_embed(:configuration, with: &config_changeset/2)
  end

  defp oci_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(url provider)a)
    |> cast_embed(:auth)
    |> validate_required([:url])
  end

  defp helm_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(url chart provider)a)
    |> cast_embed(:auth)
    |> validate_required([:url, :chart])
  end

  defp git_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(type repository_id)a)
    |> validate_required(~w(type repository_id)a)
  end

  defp config_changeset(model, attrs) do
    model
    |> cast(attrs, [])
    |> cast_embed(:pr, with: &pr_changeset/2)
    |> cast_embed(:pipeline, with: &pipeline_changeset/2)
  end

  defp pr_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(automation_id repository branch_template context)a)
    |> validate_required(~w(automation_id context)a)
  end

  defp pipeline_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(pipeline_id context)a)
    |> validate_required(~w(pipeline_id context)a)
  end

  defp determine_next_run(cs) do
    crontab = get_field(cs, :crontab)
    with run when not is_nil(run) <- get_change(cs, :last_run_at),
         {:ok, cron} <- Crontab.CronExpression.Parser.parse(crontab),
         {:ok, next} <- Crontab.Scheduler.get_next_run_date(cron, Timex.to_naive_datetime(run)) do
      put_change(cs, :next_run_at, next_run(next))
    else
      {:error, _} = err ->
        add_error(cs, :crontab, "Failed to generate next run date: #{inspect(err)}")
      _ -> cs
    end
  end

  defp next_run(ndt) do
    DateTime.from_naive!(ndt, "Etc/UTC")
    |> Map.put(:microsecond, {0, 6})
    |> Timex.shift(seconds: Console.jitter(60))
  end
end
