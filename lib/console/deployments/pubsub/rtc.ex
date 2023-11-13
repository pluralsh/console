## I need to find a way to provide authorization for this that's not a major perf drag

# defimpl Console.PubSub.Rtc, for: [
#   Console.PubSub.ServiceUpdated,
#   Console.PubSub.ClusterUpdated,
#   Console.PubSub.ProviderUpdated,
#   Console.PubSub.GitRepositoryUpdated,
# ] do
#   def deliver(%{item: item}), do: {item, :update}
# end

# defimpl Console.PubSub.Rtc, for: [
#   Console.PubSub.ServiceCreated,
#   Console.PubSub.ServiceDeleted,
#   Console.PubSub.ClusterCreated,
#   Console.PubSub.ClusterDeleted,
#   Console.PubSub.ProviderCreated,
#   Console.PubSub.GitRepositoryCreated
# ] do
#   def deliver(%{item: item}), do: {item, :create}
# end
