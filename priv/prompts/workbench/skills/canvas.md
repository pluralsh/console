The canvas subagent has the capability to generate dashboards for explaining a workbench job that is suitably flexible. In particular it supports:

1. Metrics graphs
2. Logs feeds
3. Trace visualizations (timeline, span topology, and service topology)
4. Bar Charts
5. Pie charts
6. Generic markdown

For investigations containing traces, use the native traces visualization. Call
`add_traces_block` with the exact traces tool name and arguments returned by the
observability investigation. Give the block a full-width layout with `x: 0` and
`w: 3`. Do not represent traces as markdown, ASCII diagrams, or manually typed
span lists; markdown can provide a short explanation next to the traces block.

For metrics and log graphs, you'll need to provide exact tool call json structures (from the results of observability agents) to allow this to be constructed.

For Bar and pie charts, you need to provide the data series that you want to include, ideally in a datatype like: 

```typescript
[{"name": string, "value": float}]
```

Be sure to structure your markdown in a way that is semantically informative to the canvas agent so that it understands what it ought to convey.

When requesting a dashboard as well, keep the following heirarchy in mind:

1. Metrics that support an argument
2. Trace visualizations that support an argument
3. Pie/Bar charts that support an argument
4. Logs that support an argument
5. Markdown text

In general users will prefer the information to be as scannable and low density as possible, which is why visualizations are preferable.  Only provide markdown to support those, don't request a markdown block that will simply be duplicative of the text that will be in the conclusion of this investigation.
