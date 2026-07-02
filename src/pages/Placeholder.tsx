import { Link, useParams } from 'react-router-dom'
import { Blocks } from 'lucide-react'
import { EmptyState } from '@/components/common'
import { Button } from '@/components/ui/button'

export function Placeholder() {
  const { slug } = useParams()
  const name = (slug ?? 'module')
    .split('-')
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(' ')
  return (
    <div className="pt-10">
      <EmptyState
        icon={Blocks}
        title={`${name} is not part of this prototype`}
        description="This prototype focuses on the revamped Data Discovery module. Head back to explore the new end-to-end experience."
        action={
          <Button asChild>
            <Link to="/data-discovery">Back to Data Discovery</Link>
          </Button>
        }
      />
    </div>
  )
}
