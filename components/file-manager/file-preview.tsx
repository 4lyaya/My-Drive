'use client';

import { useState, useEffect } from 'react';
import { X, Download, FileText, File, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import javascript from 'react-syntax-highlighter/dist/esm/languages/hljs/javascript';
import typescript from 'react-syntax-highlighter/dist/esm/languages/hljs/typescript';
import python from 'react-syntax-highlighter/dist/esm/languages/hljs/python';
import css from 'react-syntax-highlighter/dist/esm/languages/hljs/css';
import json from 'react-syntax-highlighter/dist/esm/languages/hljs/json';
import xml from 'react-syntax-highlighter/dist/esm/languages/hljs/xml';
import markdown from 'react-syntax-highlighter/dist/esm/languages/hljs/markdown';
import type { FileItem } from '@/lib/types';
import { formatFileSize, formatDate, getMimeTypeCategory, getFileExtension } from '@/lib/types';
import { saveAs } from 'file-saver';

SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('typescript', typescript);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('css', css);
SyntaxHighlighter.registerLanguage('json', json);
SyntaxHighlighter.registerLanguage('xml', xml);
SyntaxHighlighter.registerLanguage('html', xml);
SyntaxHighlighter.registerLanguage('markdown', markdown);

interface FilePreviewProps {
  file: FileItem | null;
  onClose: () => void;
}

function getLanguage(filename: string, mimeType: string): string {
  const ext = getFileExtension(filename);
  const langMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    css: 'css',
    scss: 'css',
    json: 'json',
    html: 'html',
    xml: 'xml',
    svg: 'xml',
    md: 'markdown',
  };
  return langMap[ext] || 'plaintext';
}

export function FilePreview({ file, onClose }: FilePreviewProps) {
  const [content, setContent] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (!file) return;

    setLoading(true);
    setZoom(1);
    setRotation(0);

    const category = getMimeTypeCategory(file.mimeType);
    const url = URL.createObjectURL(file.data);
    setBlobUrl(url);

    if (category === 'text' || file.mimeType === 'application/json') {
      file.data.text().then(text => {
        setContent(text);
        setLoading(false);
      });
    } else {
      setContent(null);
      setLoading(false);
    }

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const handleDownload = () => {
    if (file) {
      saveAs(file.data, file.name);
    }
  };

  if (!file) return null;

  const category = getMimeTypeCategory(file.mimeType);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3 min-w-0">
          <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
          <span className="font-medium truncate">{file.name}</span>
        </div>
        <div className="flex items-center gap-2">
          {category === 'image' && (
            <>
              <button
                onClick={() => setZoom(z => Math.max(0.25, z - 0.25))}
                className="p-2 rounded hover:bg-accent transition-colors"
                title="Zoom out"
              >
                <ZoomOut className="h-5 w-5" />
              </button>
              <span className="text-sm text-muted-foreground w-16 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom(z => Math.min(4, z + 0.25))}
                className="p-2 rounded hover:bg-accent transition-colors"
                title="Zoom in"
              >
                <ZoomIn className="h-5 w-5" />
              </button>
              <button
                onClick={() => setRotation(r => (r + 90) % 360)}
                className="p-2 rounded hover:bg-accent transition-colors"
                title="Rotate"
              >
                <RotateCw className="h-5 w-5" />
              </button>
              <div className="w-px h-6 bg-border mx-2" />
            </>
          )}
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-accent transition-colors"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Download</span>
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded hover:bg-accent transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6 h-full">
            {/* Preview area */}
            <div className="flex-1 flex items-center justify-center min-h-0 overflow-auto">
              {category === 'image' && blobUrl && (
                <div className="overflow-auto max-w-full max-h-full">
                  <img
                    src={blobUrl}
                    alt={file.name}
                    className="max-w-none transition-transform duration-200"
                    style={{
                      transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    }}
                  />
                </div>
              )}

              {category === 'video' && blobUrl && (
                <video
                  src={blobUrl}
                  controls
                  className="max-w-full max-h-full rounded-lg"
                />
              )}

              {category === 'audio' && blobUrl && (
                <div className="w-full max-w-md">
                  <audio src={blobUrl} controls className="w-full" />
                </div>
              )}

              {category === 'pdf' && blobUrl && (
                <iframe
                  src={blobUrl}
                  className="w-full h-full min-h-[600px] rounded-lg border border-border"
                  title={file.name}
                />
              )}

              {category === 'text' && content !== null && (
                <div className="w-full h-full overflow-auto rounded-lg">
                  <SyntaxHighlighter
                    language={getLanguage(file.name, file.mimeType)}
                    style={atomOneDark}
                    customStyle={{
                      margin: 0,
                      padding: '1rem',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      minHeight: '100%',
                    }}
                    showLineNumbers
                  >
                    {content}
                  </SyntaxHighlighter>
                </div>
              )}

              {category === 'other' && (
                <div className="text-center text-muted-foreground">
                  <File className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>Preview not available for this file type</p>
                  <p className="text-sm">Click Download to save the file</p>
                </div>
              )}
            </div>

            {/* Metadata panel */}
            <div className="lg:w-72 shrink-0 bg-card border border-border rounded-lg p-4">
              <h3 className="font-medium mb-4">File Details</h3>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Name</dt>
                  <dd className="font-medium break-all">{file.name}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Type</dt>
                  <dd>{file.mimeType || 'Unknown'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Size</dt>
                  <dd>{formatFileSize(file.size)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Created</dt>
                  <dd>{formatDate(new Date(file.createdAt))}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Modified</dt>
                  <dd>{formatDate(new Date(file.updatedAt))}</dd>
                </div>
              </dl>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
