import ExplorerDialog from './ExplorerDialog'

export default function InsertDiskDialog({ drive, onClose }: { drive: string; onClose: () => void }) {
  return (
    <ExplorerDialog title="Insert Disk" onClose={onClose}>
      <p>Please insert a disk into drive {drive}.</p>
    </ExplorerDialog>
  )
}
