export function DisplayImage({
  attributes: { url, width = 250, height = 250, ...rest },
}) {
  return (
    <img
      alt={url}
      width={width}
      height={height}
      {...rest}
      src={url}
    />
  )
}
