import { useState } from 'react'

interface Props {
  onSavePathChange: (path: string) => void
  currentPath: string
}

function Settings({ onSavePathChange, currentPath }: Props) {
  const [path, setPath] = useState(currentPath)

  const handleSubmit = () => {
    if (path.trim()) {
      onSavePathChange(path)
    }
  }

  const handleBrowse = async () => {
    if (window.electronAPI) {
      const selectedPath = await window.electronAPI.selectFile()
      if (selectedPath) {
        setPath(selectedPath)
      }
    }
  }

  return (
    <div className="settings">
      <h3>Settings</h3>
      
      <div className="setting-group">
        <label>Save File Path:</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input 
            type="text" 
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="C:\Users\...\AppData\Local\Sandfall\Saved\SaveGames\...\Expedition_x.sav"
            style={{ flex: 1 }}
          />
          <button onClick={handleBrowse} style={{ width: 'auto', height: '36px' }}>
            📁 Browse
          </button>
        </div>
        <button onClick={handleSubmit}>Start Watching</button>
      </div>

      <div className="info">
        <p>Enter the full path to your game save file (.sav)</p>
        <p>The overlay will update automatically when you kill a boss</p>
      </div>
    </div>
  )
}

export default Settings