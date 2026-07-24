import createIcon from './createIcon'

const icon =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABcAAAAYCAYAAAARfGZ1AAAD5UlEQVR4AYxVXWhcVRD+5tx79yfZ/DSbRJv0oSi1SvWhUAoRlEqeJKKVmqIgIhRa9MmiIKKWa4sW9EUQrQiCPvkHPolCRXwUIS+C0FJ8qKBttbtpm2x2s/fnjN/Zzf6km11zdubOOTNzvpk7d85Zg9vG6mt3TkWnijeiN4sJZdrhydX49fGH9TiC27b0XfaANz3FQMjoZmTV89/BzEyggGAbw2zDp+XicbI/RnQvvsa29vU4FcaTdab1s0DPE+wnQJeh/KEBmBOLR/DLrgxt/0s94KiV1vzZ0qJ/o/xEYOQwwT8nSkJ2ZBjneUyv5lQhTjGIe8AlhJUTiOUD1BFeX7M2/ZABVtogKnuiqlnACfhtXZ9JD3i3nxA1Su1N5nipS58x4j2O8clcl27L6UBwt2MkHlqnXGLVlRIMxJh4sBboKBVujn5jILjbXAlkiPU9gC4Y1n0q8PACwsE9PxD8ajiTz3jRiyKyH+iCV3G9/hzi4hQGjL7gGsLssPU5Y8xJ7s+SOyQukExExj7k/DqGzbMtwRsbKnfkPZU3WJICtwjZkbrHBjOgOXIZyNCnZd8wNcWW4DT5ST5+mXKOOXqUjiwfrmuc5BSeiMzvTsZmcbRxwJxuE/eAa4hMrToxrZCXCNy6pHiI9EKQ6rwC/xLBBRB26nBqglexD60EaOrQJnBlnSv1wliQM19CZIxuZqMFK8bSulIuEfBXMoPRCvEtdA7ZsWFd7A2wCRysc+BnF9lqB7m1ZXN3zaeeP/qdO7Ue9Auo1Gl3RB/ZG9eDu7Fvd+stnb7BNDYkmJdfL9R2eoK3AWk6KlIVlH1j35fwsjtM8IbN98z8LwCWDCh8tfgKuVtZBVgqtEcbHBgveGlwViGjbavoLVF9Cli+0tYtlapE+IzrZvZckHbGa+YehPA0hHElcrIBvsR/lyiWRyGyADS+vFImfJz72yv/JuFGllTKN0gjCK9iVLh0xNsZOVE5hGi6mNiJ+fi+4nEkxb2NKA/MTOwR432sAHvX+SPl+17KGH2X923U0HQ9hmreRdr/pCohAwJRg1OJl15QmG+5fC8xeszgwOSQWHmFDnkArjtSprKSpHqM5aiGYSdr2pt08J91EXOSi8Z3oHRUUJEdnBR4qHgfmUMmraQshTwDhbufLY1Vq/gkHywvSYhmZlR2kxxF6kv8O7Mnd1uIonxrQY1aa1S8Z6m6qoIrClxj1j9mvJG3+gFzU5PKNx2A6/mYQVzpqjSsCPCDGPtkPfEXTHC69FjmTOmu7OnSLvJscKZ8RMJm29G5PxUR21g+YmJ/0OkcO+PpwNj7/Yulw0G4fH7k7LXr/wEAAP//oYg0lgAAAAZJREFUAwB8uWLGeMjfdQAAAABJRU5ErkJggg=='

export default createIcon(({ size, color, fullColor }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 23 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {fullColor ? (
      <image
        href={icon}
        width="23"
        height="24"
      />
    ) : (
      <>
        <mask
          id="lambda-icon-mask"
          maskUnits="userSpaceOnUse"
          style={{ maskType: 'alpha' }}
        >
          <image
            href={icon}
            width="23"
            height="24"
          />
        </mask>
        <rect
          width="23"
          height="24"
          fill={color}
          mask="url(#lambda-icon-mask)"
        />
      </>
    )}
  </svg>
))
