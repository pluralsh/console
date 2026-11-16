defmodule Console.PubSub.DevboxInstanceCreated, do: use Piazza.PubSub.Event
defmodule Console.PubSub.DevboxInstanceUpdated, do: use Piazza.PubSub.Event
defmodule Console.PubSub.DevboxInstanceEnded, do: use Piazza.PubSub.Event
defmodule Console.PubSub.DevboxThreadUpdated, do: use Piazza.PubSub.Event
defmodule Console.PubSub.DevboxInstanceDeltaCreated, do: use Piazza.PubSub.Event
defmodule Console.PubSub.DevboxInstanceIndexUpdated, do: use Piazza.PubSub.Event
defmodule Console.PubSub.DevboxSnapshotUpdated, do: use Piazza.PubSub.Event

defimpl Console.PubSub.Rtc, for: Console.PubSub.DevboxInstanceCreated do
  def deliver(%{item: inst}), do: {inst, :create}
end

defimpl Console.PubSub.Rtc, for: [
  Console.PubSub.DevboxInstanceUpdated,
  Console.PubSub.DevboxInstanceEnded,
  Console.PubSub.DevboxThreadUpdated,
  Console.PubSub.DevboxSnapshotUpdated
] do
  def deliver(%{item: item}), do: {item, :update}
end

defimpl Console.PubSub.Rtc, for: [Console.PubSub.DevboxInstanceDeltaCreated, Console.PubSub.DevboxInstanceIndexUpdated] do
  def deliver(%{item: item}), do: {item, :create}
end

defimpl Console.GraphQl.Topic, for: Console.Schema.DevboxInstance do
  def infer(%@for{id: id, workbench_id: wid}, _),
    do: [
      devbox_instance_status_delta: "devbox_instances:#{id}",
      devbox_instance_status_delta: "workbenches:#{wid}:devbox_instances"
    ]
end

defimpl Console.GraphQl.Topic, for: Console.Schema.DevboxInstanceSession do
  def infer(%@for{instance_id: id}, _), do: [devbox_thread_delta: "devbox_instances:#{id}:threads"]
end

defimpl Console.GraphQl.Topic, for: Console.Schema.DevboxInstance.Delta do
  def infer(%@for{instance_id: id}, _), do: [devbox_instance_delta: "devbox_instances:#{id}:deltas"]
end

defimpl Console.GraphQl.Topic, for: Console.Schema.DevboxInstance.IndexDelta do
  def infer(%@for{instance_id: id}, _), do: [devbox_instance_index_delta: "devbox_instances:#{id}:index"]
end

defimpl Console.GraphQl.Topic, for: Console.Schema.DevboxSnapshot do
  def infer(%@for{workbench_id: wid}, _), do: [devbox_snapshot_delta: "workbenches:#{wid}:devbox_snapshots"]
end

defimpl Console.PubSub.Recurse, for: Console.PubSub.DevboxInstanceEnded do
  def process(%{item: inst}), do: Console.Devboxes.delete_actor(inst)
end
