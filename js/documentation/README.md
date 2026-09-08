Documentation site for [Plural](https://www.plural.sh/), the open-source, unified, application deployment platform that makes it easy to run open-source software on Kubernetes. Our marketplace has dozens of top tier applications ready to deploy.

Built with [Next.js](https://nextjs.org/) and [Markdoc](https://markdoc.dev/).

## Contributing

### Running the docs locally

To run the docs locally, you'll need to have yarn and node as prerequisites. Then run the following commands:

```shell
yarn # build the environment
yarn dev # run docs locally
```

### Adding a new document

All documentation content is defined by the [`docsStructure`](/src/routing/docs-structure.ts) object. This file is the single source of truth for the docs site structure, navigation, and URL mapping. When running `yarn dev` or `yarn build`, the route indexing script will search the paths described, first for an index.md, then for a PATHNAME.md file if an index.md file isn't found (i.e. it will look first for /overview/introduction/index.md, then /overview/introduction.md if index isn't found). 

The indexing script will reconcile routes into the generated [`routes.json`](/generated/routes.json), which needs to be committed to git so changes can be confirmed/tracked. A github workflow will confirm that route changes have been committed (though lastmod timestamps are ignored, as these lag behind by one commit)

To add a new document:
- Update [`docsStructure`](/src/routing/docs-structure.ts) to include your new pages/sections. The order and nesting in this object will determine the sidebar navigation and the URL path.

- Add your new Markdown (`.md`) file to the corresponding location in the [`pages`](/pages) directory.

- If you include images, place them in [`public/assets`](/public/assets) using a directory structure that matches your document's location in `pages`.

### Updating structure and redirects

If you change the documentation structure (e.g., move, rename, or remove pages), you may need to add redirects to prevent broken links. Redirects are managed directly in [`docs-structure.ts`](/src/routing/docs-structure.ts) via the `redirects` array at the bottom of the file. Redirects on a path already defined by `docsStructure` will override where it reconciles to, which can be confirmed in [`routes.json`](/generated/routes.json)

Whenever you update the structure or add redirects, review internal links throughout the documentation to ensure there are no broken references.