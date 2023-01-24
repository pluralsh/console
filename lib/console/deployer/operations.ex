defmodule Console.Deployer.Operations do
  alias Console.Schema.Build
  alias Console.Commands.{Plural}
  alias Console.Services.Builds
  alias Console.Plural.Context
  alias Console.Deployer.Dedicated

  def perform(_, %Build{type: :dedicated, id: id} = build) do
    with {:ok, job} <- Dedicated.create_job(id),
         {:ok, build} <- Builds.add_job_name(build, job.metadata.name),
         {:ok, build} <- Builds.running(build),
      do: Dedicated.watch_job(build.job_name)
  end

  def perform(storage, %Build{repository: repo, type: :bounce} = build) do
    with_build(build, [
      {storage, :init, []},
      {Plural, :bounce, [repo]}
    ], storage)
  end

  def perform(storage, %Build{type: :deploy, repository: repo, message: message} = build) do
    with_build(build, [
      {storage, :init, []},
      {Plural, :build, [repo]},
      {Plural, :diff, [repo]},
      {Plural, :deploy, [repo]},
      {storage, :revise, [commit_message(message, repo)]},
      {storage, :push, []}
    ], storage)
  end

  def perform(storage, %Build{type: :install, context: %{"configuration" => conf, "bundle" => b}, message: message} = build) do
    with_build(build, [
      {storage, :init, []},
      {Context, :merge, [conf, %Context.Bundle{repository: b["repository"], name: b["name"]}]},
      {Plural, :build, []},
      {Plural, :install, [b["repository"]]},
      {storage, :revise, [commit_message(message, b["repository"])]},
      {storage, :push, []}
    ], storage)
  end

  def perform(storage, %Build{type: :install, context: %{"configuration" => conf, "bundles" => bs} = ctx, message: message} = build) do
    with_build(build, [
      {storage, :init, []},
      {Context, :merge, [conf, Enum.map(bs, fn b -> %Context.Bundle{repository: b["repository"], name: b["name"]} end), ctx["buckets"], ctx["domains"]]},
      {Plural, :build, []},
      {Plural, :install, [Enum.map(bs, & &1["repository"])]},
      {storage, :revise, [message]},
      {storage, :push, []}
    ], storage)
  end

  def perform(storage, %Build{type: :approval, repository: repo, message: message} = build) do
    with_build(build, [
      {storage, :init, []},
      {Plural, :build, [repo]},
      {Plural, :diff, [repo]},
      :approval,
      {Plural, :deploy, [repo]},
      {storage, :revise, [commit_message(message, repo)]},
      {storage, :push, []}
    ], storage)
  end

  def perform(storage, %Build{type: :destroy, repository: repo} = build) do
    with_build(build, [
      {storage, :init, []},
      {Plural, :destroy, [repo]},
      {storage, :revise, ["destroyed application #{repo}"]},
      {storage, :push, []}
    ], storage)
  end

  def with_build(%Build{} = build, operations, storage) do
    {:ok, pid} = Console.Runner.start_link(build, operations, storage)
    Swarm.register_name(build.id, pid)
    Console.Runner.register(pid)
    ref = Process.monitor(pid)
    {:ok, pid, ref}
  end

  def commit_message(nil, repo), do: "console deployment for #{repo}"
  def commit_message(message, repo), do: "console deployment for #{repo} -- #{message}"
end
