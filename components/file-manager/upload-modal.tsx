'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { X, Upload, File, AlertCircle, CheckCircle2 } from 'lucide-react';
import { uploadFile } from '@/hooks/use-file-manager';
import { formatFileSize } from '@/lib/types';
import { cn } from '@/lib/utils';

interface UploadModalProps {
  isOpen: boolean;
  folderId: string | null;
  onClose: () => void;
  onUploadComplete: () => void;
}

interface UploadProgress {
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export function UploadModal({ isOpen, folderId, onClose, onUploadComplete }: UploadModalProps) {
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newUploads: UploadProgress[] = acceptedFiles.map(file => ({
      file,
      status: file.size > MAX_FILE_SIZE ? 'error' : 'pending',
      error: file.size > MAX_FILE_SIZE ? 'File exceeds 50MB limit' : undefined,
    }));
    setUploads(prev => [...prev, ...newUploads]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
  });

  const handleUpload = async () => {
    const pendingUploads = uploads.filter(u => u.status === 'pending');
    if (pendingUploads.length === 0) return;

    setIsUploading(true);

    for (const upload of pendingUploads) {
      setUploads(prev =>
        prev.map(u =>
          u.file === upload.file ? { ...u, status: 'uploading' } : u
        )
      );

      try {
        await uploadFile(upload.file, folderId);
        setUploads(prev =>
          prev.map(u =>
            u.file === upload.file ? { ...u, status: 'success' } : u
          )
        );
      } catch (error) {
        setUploads(prev =>
          prev.map(u =>
            u.file === upload.file
              ? { ...u, status: 'error', error: 'Upload failed' }
              : u
          )
        );
      }
    }

    setIsUploading(false);
    onUploadComplete();
  };

  const removeUpload = (file: File) => {
    setUploads(prev => prev.filter(u => u.file !== file));
  };

  const handleClose = () => {
    if (!isUploading) {
      setUploads([]);
      onClose();
    }
  };

  const pendingCount = uploads.filter(u => u.status === 'pending').length;
  const successCount = uploads.filter(u => u.status === 'success').length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4 bg-card border border-border rounded-lg shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Upload Files</h2>
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="p-1 rounded hover:bg-accent transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4">
          {/* Drop zone */}
          <div
            {...getRootProps()}
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
              isDragActive
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50'
            )}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-primary">Drop files here...</p>
            ) : (
              <>
                <p className="text-foreground mb-1">
                  Drag and drop files here, or click to select
                </p>
                <p className="text-sm text-muted-foreground">
                  Maximum file size: 50MB
                </p>
              </>
            )}
          </div>

          {/* Upload list */}
          {uploads.length > 0 && (
            <div className="mt-4 max-h-60 overflow-auto space-y-2">
              {uploads.map((upload, index) => (
                <div
                  key={`${upload.file.name}-${index}`}
                  className="flex items-center gap-3 p-3 bg-muted rounded-lg"
                >
                  <File className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{upload.file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(upload.file.size)}
                    </p>
                  </div>
                  <div className="shrink-0">
                    {upload.status === 'pending' && (
                      <button
                        onClick={() => removeUpload(upload.file)}
                        className="p-1 hover:bg-accent rounded transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                    {upload.status === 'uploading' && (
                      <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    )}
                    {upload.status === 'success' && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    )}
                    {upload.status === 'error' && (
                      <div className="flex items-center gap-1">
                        <AlertCircle className="h-4 w-4 text-destructive" />
                        <span className="text-xs text-destructive">{upload.error}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-4 border-t border-border bg-muted/50">
          <div className="text-sm text-muted-foreground">
            {uploads.length > 0 && (
              <span>
                {successCount}/{uploads.length} uploaded
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleClose}
              disabled={isUploading}
              className="px-4 py-2 text-sm rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={pendingCount === 0 || isUploading}
              className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isUploading ? 'Uploading...' : `Upload ${pendingCount} file${pendingCount !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
