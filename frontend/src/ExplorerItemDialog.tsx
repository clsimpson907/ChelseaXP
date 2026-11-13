import ExplorerDialog from './ExplorerDialog'

export default function ExplorerItemDialog({ name, onCancel, onConfirm, operation = 'delete', isFolder = false }: {
  name: string
  isFolder?: boolean
  onCancel: () => void
  onConfirm?: () => void
  operation?: 'rename' | 'delete'
}) {
  const errorTitle = operation === 'rename' ? 'Error Renaming File or Folder' : 'Error Deleting File or Folder'

  return (
    <ExplorerDialog title={onConfirm ? (isFolder ? 'Confirm Folder Delete' : 'Confirm File Delete') : errorTitle} onClose={onCancel} onConfirm={onConfirm}>
      {onConfirm ? <p>Are you sure you want to delete {isFolder ? 'the folder ' : 'the file '}“{name}”{isFolder ? ' and all its contents' : ''}?</p> : (
        <div className="folder-delete-error">
          <img src="/icons/critical.png" alt="" width="32" height="32" />
          <p>Cannot {operation} {name}: Access is denied.</p>
        </div>
      )}
    </ExplorerDialog>
  )
}
