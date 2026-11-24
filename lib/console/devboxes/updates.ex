defmodule Console.Devboxes.Updates do
  @moduledoc """
  Moves instances to their box's current template revision.  A box rolls a new revision when its environment image
  or its devbox-daemon changes (the deployment operator delivers the daemon, so an operator upgrade is enough); an
  instance behind it is outdated, and updating it restarts it on the new revision with its home volume and threads.

  The gateway does the move (`Control.rebase_instance/2`) and applies the box's `onResume` policy itself.  Console
  decides everything else: a user updating their own instance, and admin campaigns that update a whole box, which
  `run/0` advances from cron.  Console is the only scheduler; the gateway never moves an instance on its own beyond
  `onResume`.
  """
  use Console.Services.Base
  import Console.Deployments.Policies
  require Logger
  alias Console.Devboxes
  alias Console.Devboxes.Control
  alias Console.Schema.{Devbox, DevboxInstance, DevboxUpdateCampaign, User}

  @type error :: Console.error
  @type instance_resp :: {:ok, DevboxInstance.t} | error
  @type campaign_resp :: {:ok, DevboxUpdateCampaign.t} | error

  # how often one campaign tries one instance, and how long a requested update may go unreported before it is
  # tried again
  @max_attempts 3
  @retry_after 10 * 60

  def get_campaign!(id), do: Repo.get!(DevboxUpdateCampaign, id)

  @doc """
  Updates one instance now, for its owner or anyone who can manage it.  A running instance restarts.
  """
  @spec rebase_instance(binary, User.t) :: instance_resp
  def rebase_instance(id, %User{} = user) do
    with {:ok, inst} <- allow(Devboxes.get_instance!(id), user, :cancel),
         {:ok, inst} <- Devboxes.ensure_status(inst, [:running, :suspended]),
         {:ok, inst} <- ensure_outdated(Repo.preload(inst, [:devbox])),
      do: request(inst, %{reason: "requested by #{user.email}", principal: user}, %{rebase_attempts: 0})
  end

  defp ensure_outdated(%DevboxInstance{} = inst) do
    case DevboxInstance.outdated?(inst) do
      true -> {:ok, inst}
      false -> {:error, "this devbox instance is already on its box's current revision"}
    end
  end

  # Asks the gateway, and records that an update is on its way so nothing asks again until it reports or times
  # out.  The gateway declines (`accepted: false`) when it already has the instance on the revision, which it
  # won't report again: then only the request is noted, and the instance's next status report settles the rest.
  defp request(%DevboxInstance{} = inst, opts, attrs) do
    case Control.rebase_instance(inst, opts) do
      {:ok, %{accepted: false}} -> note_request(inst, attrs)
      res ->
        with {:ok, _} <- Devboxes.control_result(res, inst),
          do: note_request(inst, Map.merge(%{rebase_state: :in_progress, rebase_error: nil}, attrs))
    end
  end

  defp note_request(inst, attrs) do
    inst
    |> DevboxInstance.changeset(Map.put(attrs, :rebase_requested_at, DateTime.utc_now()))
    |> Repo.update()
    |> Devboxes.notify(:update)
  end

  @doc """
  Starts updating every outdated instance of a box.  Needs write access to the box; forcing it, which also
  restarts instances people are using after a notice period, is for admins (it exists for security fixes).
  Only one campaign runs per box.
  """
  @spec create_campaign(map, binary, User.t) :: campaign_resp
  def create_campaign(attrs, devbox_id, %User{id: user_id} = user) do
    start_transaction()
    |> add_operation(:devbox, fn _ ->
      Devbox.with_lock()
      |> Repo.get!(devbox_id)
      |> allow(user, :write)
    end)
    |> add_operation(:force, fn _ -> check_force(attrs, user) end)
    |> add_operation(:revision, fn
      %{devbox: %Devbox{revision: rev}} when is_integer(rev) -> {:ok, rev}
      _ -> {:error, "this devbox hasn't reported a template revision to update instances to (its deployment operator may need an upgrade)"}
    end)
    |> add_operation(:idle, fn _ ->
      case DevboxUpdateCampaign.for_devbox(devbox_id) |> DevboxUpdateCampaign.active() |> Repo.exists?() do
        true -> {:error, "an update campaign is already running for this devbox, cancel it first"}
        false -> {:ok, true}
      end
    end)
    |> add_operation(:campaign, fn _ ->
      %DevboxUpdateCampaign{devbox_id: devbox_id, user_id: user_id}
      |> DevboxUpdateCampaign.changeset(attrs)
      |> Repo.insert()
    end)
    |> execute(extract: :campaign)
  end

  defp check_force(%{force: true}, %User{roles: %{admin: true}}), do: {:ok, true}
  defp check_force(%{force: true}, _), do: {:error, "only admins can force an update of instances that are in use"}
  defp check_force(_, _), do: {:ok, false}

  @doc """
  Stops a campaign.  Updates already requested finish; deadlines shown to users are withdrawn.
  """
  @spec cancel_campaign(binary, User.t) :: campaign_resp
  def cancel_campaign(id, %User{} = user) do
    campaign = get_campaign!(id) |> Repo.preload([:devbox])
    with {:ok, _} <- allow(campaign.devbox, user, :write),
         true <- DevboxUpdateCampaign.active?(campaign) || {:error, "this campaign has already ended"},
      do: finish(campaign, :cancelled)
  end

  defp finish(%DevboxUpdateCampaign{id: id} = campaign, status) do
    DevboxInstance.for_campaign(id)
    |> Repo.all()
    |> Enum.filter(& &1.update_deadline_at)
    |> Enum.each(fn inst ->
      DevboxInstance.changeset(inst, %{update_deadline_at: nil})
      |> Repo.update()
      |> Devboxes.notify(:update)
    end)

    campaign
    |> DevboxUpdateCampaign.status_changeset(%{status: status, completed_at: DateTime.utc_now()})
    |> Repo.update()
  end

  @doc """
  Where a campaign stands: how many of the box's live instances are still outdated, and how many this campaign
  updated or gave up on.
  """
  @spec progress(DevboxUpdateCampaign.t) :: %{outdated: integer, updated: integer, failed: integer}
  def progress(%DevboxUpdateCampaign{id: id, devbox_id: devbox_id}) do
    states =
      DevboxInstance.for_campaign(id)
      |> Repo.all()
      |> Enum.frequencies_by(& &1.rebase_state)

    %{
      outdated: outdated_count(devbox_id),
      updated: Map.get(states, :succeeded, 0),
      failed: Map.get(states, :failed, 0)
    }
  end

  @doc "How many live instances of a box are behind its current revision"
  @spec outdated_count(binary) :: integer
  def outdated_count(devbox_id) do
    DevboxInstance.for_devbox(devbox_id)
    |> DevboxInstance.live()
    |> DevboxInstance.outdated()
    |> Repo.aggregate(:count)
  end

  @doc """
  Advances every campaign that has started.  Called from cron every minute.
  """
  @spec run() :: :ok
  def run() do
    DevboxUpdateCampaign.active()
    |> DevboxUpdateCampaign.started()
    |> Repo.all()
    |> Repo.preload([:devbox])
    |> Enum.each(fn campaign ->
      case advance(campaign) do
        {:error, err} -> Logger.error("failed to advance devbox update campaign #{campaign.id}: #{inspect(err)}")
        _ -> :ok
      end
    end)
  end

  @doc """
  One step of a campaign: announce the deadline of a forced one, then request as many updates as its concurrency
  allows, the instances nobody is using first.  It completes once nothing is left that it could still update, or
  when it expires.
  """
  @spec advance(DevboxUpdateCampaign.t, DateTime.t) :: campaign_resp
  def advance(%DevboxUpdateCampaign{} = campaign, now \\ DateTime.utc_now()) do
    outdated =
      DevboxInstance.for_devbox(campaign.devbox_id)
      |> DevboxInstance.live()
      |> DevboxInstance.outdated()
      |> Repo.all()

    in_flight = Enum.count(outdated, &in_flight?(&1, now))
    remaining = Enum.reject(outdated, &exhausted?(&1, campaign))

    cond do
      DateTime.compare(now, campaign.expires_at) != :lt -> finish(campaign, :completed)
      remaining == [] and in_flight == 0 -> finish(campaign, :completed)
      true ->
        with {:ok, campaign} <- mark_running(campaign) do
          remaining = announce(campaign, remaining)

          remaining
          |> Enum.filter(&due?(&1, campaign, now))
          |> Enum.sort_by(&priority/1)
          |> Enum.take(max(campaign.max_concurrency - in_flight, 0))
          |> Enum.each(&update(&1, campaign))

          {:ok, campaign}
        end
    end
  end

  defp mark_running(%DevboxUpdateCampaign{status: :running} = campaign), do: {:ok, campaign}
  defp mark_running(campaign) do
    campaign
    |> DevboxUpdateCampaign.status_changeset(%{status: :running})
    |> Repo.update()
  end

  # A forced campaign shows people using an instance when it will be restarted.
  defp announce(%DevboxUpdateCampaign{force: true, id: id, deadline_at: deadline}, instances) do
    Enum.map(instances, fn
      %DevboxInstance{status: :running, update_deadline_at: nil} = inst ->
        DevboxInstance.changeset(inst, %{update_deadline_at: deadline, update_campaign_id: id, rebase_attempts: attempts(inst, id)})
        |> Repo.update()
        |> Devboxes.notify(:update)
        |> case do
          {:ok, inst} -> inst
          _ -> inst
        end
      inst -> inst
    end)
  end
  defp announce(_, instances), do: instances

  defp update(%DevboxInstance{} = inst, %DevboxUpdateCampaign{id: id} = campaign) do
    reason = if campaign.force, do: "forced update #{id}", else: "update #{id}"
    case request(inst, %{reason: reason}, %{update_campaign_id: id, rebase_attempts: attempts(inst, id) + 1}) do
      {:ok, _} -> :ok
      err ->
        Logger.warning("could not request the update of devbox instance #{inst.id}: #{inspect(err)}")
        # count it, so an instance the gateway keeps refusing doesn't hold the campaign open
        DevboxInstance.changeset(inst, %{update_campaign_id: id, rebase_attempts: attempts(inst, id) + 1, rebase_requested_at: DateTime.utc_now()})
        |> Repo.update()
    end
  end

  # attempts are per campaign
  defp attempts(%DevboxInstance{update_campaign_id: id, rebase_attempts: n}, id), do: n || 0
  defp attempts(_, _), do: 0

  defp exhausted?(inst, %DevboxUpdateCampaign{id: id}), do: attempts(inst, id) >= @max_attempts

  defp in_flight?(%DevboxInstance{rebase_state: :in_progress} = inst, now), do: recent?(inst, now)
  defp in_flight?(_, _), do: false

  defp recent?(%DevboxInstance{rebase_requested_at: %DateTime{} = at}, now), do: DateTime.diff(now, at, :second) < @retry_after
  defp recent?(_, _), do: false

  # Suspended and idle instances lose nothing a person would notice.  One in use is only restarted by a forced
  # campaign past its deadline.  An instance that was just tried is left alone until it reports or times out.
  defp due?(%DevboxInstance{} = inst, campaign, now) do
    case recent?(inst, now) do
      true -> false
      false -> quiet?(inst) or forced?(inst, campaign, now)
    end
  end

  defp quiet?(%DevboxInstance{status: :suspended}), do: true
  defp quiet?(%DevboxInstance{status: :running, idle_state: %{idle: true}}), do: true
  defp quiet?(_), do: false

  defp forced?(%DevboxInstance{status: :running}, %DevboxUpdateCampaign{force: true, deadline_at: %DateTime{} = deadline}, now),
    do: DateTime.compare(now, deadline) != :lt
  defp forced?(_, _, _), do: false

  defp priority(%DevboxInstance{status: :suspended}), do: 0
  defp priority(%DevboxInstance{idle_state: %{idle: true}}), do: 1
  defp priority(_), do: 2
end
