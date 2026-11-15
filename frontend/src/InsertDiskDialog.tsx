import ExplorerDialog from './ExplorerDialog'

export default function InsertDiskDialog({ drive, icon, onClose }: { drive: string; icon: string; onClose: () => void }) {
  return (
    <ExplorerDialog title="Insert Disk" onClose={onClose}>
      <div className="insert-disk-message">
        <img src={'/icons/' + icon + '.png'} alt="" width="32" height="32" />
        <p>Please insert a disk into drive {drive}.</p>
      </div>
    </ExplorerDialog>
  )
}
