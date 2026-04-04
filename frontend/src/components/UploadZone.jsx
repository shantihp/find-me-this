import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'

export default function UploadZone({ onImage, disabled }) {
  const [preview, setPreview] = useState(null)

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target.result
      setPreview(dataUrl)
      // Strip the "data:image/jpeg;base64," prefix
      const base64 = dataUrl.split(',')[1]
      onImage(base64, dataUrl)
    }
    reader.readAsDataURL(file)
  }, [onImage])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxFiles: 1,
    disabled,
  })

  return (
    <div className="w-full max-w-lg mx-auto">
      {preview ? (
        <div className="relative rounded-2xl overflow-hidden shadow-lg group">
          <img src={preview} alt="Preview" className="w-full max-h-80 object-cover" />
          <button
            onClick={() => setPreview(null)}
            className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm transition"
          >
            ✕
          </button>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all
            ${isDragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input {...getInputProps()} />
          <div className="text-5xl mb-4">📸</div>
          <p className="text-lg font-semibold text-gray-800">
            {isDragActive ? 'Drop your photo here' : 'Upload a photo to find it'}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Drag & drop or click — supports JPG, PNG, WebP
          </p>
          <p className="text-xs text-gray-400 mt-3">
            Works best with dresses, tops, kurtas, lipsticks, mascaras, and more
          </p>
        </div>
      )}
    </div>
  )
}
