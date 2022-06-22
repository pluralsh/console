# Plural's design system

[Documentation](https://pluralsh-design.web.app)

## Installation

`npm i -S pluralsh-design-system`

## Usage

```jsx
Import { Alert } from 'pluralsh-design-system'

// ...
return (
  <Alert
    severy="success"
    title="Wouhou!"
  >
    You installed pluralsh-design-system correcly
  </Alert>
)
```

## Development

`npm i && npm start` and view the Storybook at http://localhost:6006

Checklist for creating a new component:

- Does it have proper type definitions?
- Does it have prop types?
- Can it pass a ref with forwardRef?
- Does it have a story in the Storybook?

## Contributing

Yes, thank you!

## License

MIT
