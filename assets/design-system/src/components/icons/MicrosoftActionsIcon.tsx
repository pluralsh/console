import createIcon from './createIcon'

const icon =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAVCAYAAABc6S4mAAACP0lEQVR4AaSVsW4TQRCGZ9e5hiYpAuItkKCJkyI2JQWPAUKCltZ2QUUJEgqPQY1wIoGDQATBYyCEoEgi4rvd7Le6ueyd75KTYvnP7s78/z+j2fPFSs/P8setaf7z5jzi6+ZH92H9myI/2HzYZdO7gBGZiDcjYE6KHe/kLpDwWdv9/S4srd9eBZbfb48q9dKJgDLgBtms3LYuvQqYQTFRtTkudCt+YF5f1j3EzgLDt4v59t6naeye0cAGZffGytHa+O+zrTeHI7ik2rBSIAr2Ft54f7B4vDOtiU4uutfRfH4y3Ic7DBq0NX441ApAMNbPjfiZmtfHkweJrIwGLhq0eERS+acqQAICRATka+MpR0PcFP5p8X7dK/L5xis0aPHACx6IBZg1CQgQSYC0e1l6kcxKDYGkdxG2ghYPvPAkZtl4MRMSEAhWSC/3xkD8RlZBOXoXesYDLzzxtt6YXZIkWFN4kVmKKse4Aroe09TLHj7aHouRfR61dHaYZXd+TVMQA/wW0tEQS4EXnhSyJGKRsGF2zSIhHL/xwtmFR9UU7sje/3ePYxOY89iqZywAiQCz6yqiF26Oc2nOHT2N8VvAnM6JgaoABxKdRbjw0H3b3DGnMbR44KWoFSAIASIChMTieMKl2tM8vh6IKeDARYNW47quFCABEQF7EMdz6r50zd07M0YDt4nWApAQ8J6J3Z/5kTj7gngTcEAzrufOAkpg9bl7edVrGV4bri7w/+xBtvXneZu4T+zSAvyvvY45DZwDAAD//45G9PoAAAAGSURBVAMARbFYWb7haUoAAAAASUVORK5CYII='

export default createIcon(({ size, color, fullColor }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 21"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {fullColor ? (
      <image
        href={icon}
        width="24"
        height="21"
      />
    ) : (
      <>
        <mask
          id="microsoft-actions-icon-mask"
          maskUnits="userSpaceOnUse"
          style={{ maskType: 'alpha' }}
        >
          <image
            href={icon}
            width="24"
            height="21"
          />
        </mask>
        <rect
          width="24"
          height="21"
          fill={color}
          mask="url(#microsoft-actions-icon-mask)"
        />
      </>
    )}
  </svg>
))
