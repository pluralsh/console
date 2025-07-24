import { forwardRef } from 'react'
import { useTheme } from 'styled-components'

// Type that reflects only available AWS icons
enum AWSIconName {
  Account = 'account',
  Compute = 'compute',
  Containers = 'containers',
  Database = 'database',
  EC2 = 'ec2',
  EC2Instance = 'ec2-instance',
  IAM = 'iam',
  Lambda = 'lambda',
  PrivateSubnet = 'private-subnet',
  S3 = 's3',
  Security = 'security',
  SpotFleet = 'spot-fleet',
  Storage = 'storage',
  VPC = 'vpc',
}

interface AWSIconProps {
  name: AWSIconName
  size?: number | string
}

const AWSIcon = forwardRef<HTMLImageElement, AWSIconProps>(
  ({ name = 'ec2', size = 24, ...props }, ref) => {
    const theme = useTheme()

    return (
      <img
        ref={ref}
        src={`/icons/aws/${name}.svg`}
        alt={`AWS ${name} icon`}
        width={size}
        height={size}
        style={{
          display: 'block',
          borderRadius: theme.borderRadiuses.medium,
        }}
        {...props}
      />
    )
  }
)

export default AWSIcon

export { AWSIconName }
