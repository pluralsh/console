import createIcon from './createIcon'

const icon =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAERElEQVR4AZxVW0xcVRRd+9x7y2OAMsC0QAtCLZq2iUCT1sTQShsf1JjAD1/GtDb+NtH0o/Jh5Mf0A43xmWjU6GdRY6IQf7S2VFpSE5uY2DagplKttjyEeTN37tnuMzPMiymoO2fdu++5e691zt7nziiUNKbBUbZ6h9n+NzCxAFMpqjUChvDQ6eje+enIx8qOTioncnFdSIyJPfBytNvkFosUCTBpK9hOmkeI8BSI90vCvnUhMSbWIR4xucU7KRB4bASVFqkjDPTiPxozDtlw+gxHfmpOYJhVLBG5F4QTUkwZ+WEb+5JAUN6JFIdwIWNZgV4s1ViMZwi0M/Puf9yowwaOPVKO6tXklMDgIFuWY3crwtHVF+Ze7gB1PoLMw1cGbK5M+1jHCDjqJcJdhtOEpQTm9oT8DPWcTPgF2bGlhvDwLgvtAUJbA+HwbgsdjQpGOBu01qmDwvOL3aFa80pB6mU5qo/BR8xEPhIesL2O8OgegvaS6NgKPNmlsLdNob6KIKcnPzznEz2hWT1uuNVBe3GbBk4SIAXJxRhvKcK4uchokrVoL4GZWyuIxBJornHxkHRq51ZCmRTdxObDcAlOHrZjTUrxpuPy0JkfsOrHXeD3BYZSCqZcS2EXC6Ekfv4zDn+li74HFHrut+CXPpXYTbdm75j0j44LoWjItcRYCGtEE4TWgI25oId7Ag4G9lehfYuDfTssPN2zScpmobZCvp7CfBJ7VoEQKpwvfiIQATJg7i0NDg7srsRBQbPfgdYe3EQcXiIG1kkUGCGumPlNmZR2yrXEaKgmOaKM2TkXzX47BRMWXdGYvBbFR2eX8cX3YSwGRcTNiciCNLN6W1kWfyoJE4I1wxzHlnqC52ncXpbySFk2+xRm512MXgzhw7NBXLgWx3JUwxSIPVd2Ek3thBnfeco7o74Zql4EaEQQRpGZ5rXIMb25kISsCI21Fqam4/jg62V8PhXGL7ddJJKGOpdoypR0o1HP069cGKqalx4Ql7mVk/Jr/kkuLO1ZxHI0Y/jqhwhkE7g8E8f7Qj55PY6/I7LqQu50klzZ8z5zoskJELGSZzwIhFnjHfH/EGTHnaDGxNUV3Ljj4ob04NxPMfxaYtXZBOMQbslu3+qp8KcOT0pgeJg0kpHrHvhdWZQMEwkkPEIwsQkgB9EVRih291UjY6z5PcspuzpsOGUuJSB3nHspEFG2MyrqV8xzGgRl2VBOOUjZ2Nj4isf6jOFajc0KmHrF/5qb1Yw35GXesaWMSMUGIpTUsF5H3P7NcCFjOQGZuPTa9jgs9zxAX6LASEQc2cndReR7GvM893yKAzkrEID8Cfeu1M6y9l7QGq+CMcbA+CrIcsaVXTYOqHEhTAM8BqaRBLunpsrbZg0H8qxIADDN+fbF6unAj75T9ff5Bho6fP35COyq62/s3Nbf1NWaRmfrQOPMpaHLp3fMINNY5Nk/AAAA///Eup1SAAAABklEQVQDAKtD2E0fWLTJAAAAAElFTkSuQmCC'

export default createIcon(({ size, color, fullColor }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {fullColor ? (
      <image
        href={icon}
        width="24"
        height="24"
      />
    ) : (
      <>
        <mask
          id="google-cloud-run-icon-mask"
          maskUnits="userSpaceOnUse"
          style={{ maskType: 'alpha' }}
        >
          <image
            href={icon}
            width="24"
            height="24"
          />
        </mask>
        <rect
          width="24"
          height="24"
          fill={color}
          mask="url(#google-cloud-run-icon-mask)"
        />
      </>
    )}
  </svg>
))
