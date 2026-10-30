defmodule ConsoleWeb.Subscriptions do
  @moduledoc """
  Replacement for `Absinthe.Subscription.Local`'s document runner, wired in through the endpoint's
  optional `run_docset/3` pubsub callback.  It behaves identically, except documents flagged by
  `Console.Middleware.SubscriptionPolicy` are not published to their subscriber.
  """
  alias Absinthe.Subscription.Local
  alias Absinthe.Pipeline.BatchResolver
  alias Console.Middleware.SubscriptionPolicy
  alias Console.Deployments.Settings

  def run_docset(pubsub, docs_and_topics, mutation_result) do
    # policy-checked subscriptions can fall back to the global settings for every subscriber, so they're
    # looked up at most once per event, and only if a policy check needs them
    Settings.memoize(fn ->
      for {topic, _key_strategy, doc} <- docs_and_topics do
        try do
          pipeline = Local.pipeline(doc, mutation_result)
          {:ok, %{result: data} = blueprint, _} = Absinthe.Pipeline.run(doc.source, pipeline)

          unless SubscriptionPolicy.skip?(blueprint),
            do: :ok = pubsub.publish_subscription(topic, data)
        rescue
          e -> BatchResolver.pipeline_error(e, __STACKTRACE__)
        end
      end
    end)
  end
end
