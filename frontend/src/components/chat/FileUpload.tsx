import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Image, FileText } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
}

export default function FileUpload({ onFileSelect }: FileUploadProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0]);
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    accept: {
      'text/*': ['.kts', '.groovy', '.jenkinsfile', '.json', '.yaml', '.yml', '.txt'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    },
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
        isDragActive
          ? 'border-blue-500 bg-blue-500/10'
          : 'border-gray-700 hover:border-gray-600 hover:bg-gray-800/50'
      }`}
    >
      <input {...getInputProps()} />
      <Upload className="w-8 h-8 text-gray-500 mx-auto mb-2" />
      <p className="text-sm text-gray-400 mb-1">
        {isDragActive ? 'Drop file here...' : 'Drag & drop a file, or click to select'}
      </p>
      <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <FileText className="w-3 h-3" /> .kts, .groovy, .json, .yml
        </span>
        <span className="flex items-center gap-1">
          <Image className="w-3 h-3" /> Screenshots
        </span>
      </div>
    </div>
  );
}
