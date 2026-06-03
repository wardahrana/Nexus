import { useEffect, useRef, useState } from 'react';
import { FileText, Upload, Share2, Trash2, Eye, CheckCircle } from 'lucide-react';
import { getMyDocuments, uploadDocument, deleteDocument } from '../../services/documentAPI';
import SignaturePad from '../../components/documents/SignaturePad';

interface Document {
  _id: string;
  title: string;
  originalName: string;
  fileUrl: string;
  mimeType: string;
  size: number;
  status: string;
  signedAt: string | null;
  uploadedBy: { name: string; email: string };
  createdAt: string;
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'upload'>('all');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [signingDoc, setSigningDoc] = useState<Document | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const res = await getMyDocuments();
      setDocs(res.data.documents);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) return alert('Please select a file');
    if (!title.trim()) return alert('Please enter a title');

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('title', title);

    setUploading(true);
    try {
      await uploadDocument(formData);
      setTitle('');
      setSelectedFile(null);
      setActiveTab('all');
      fetchDocs();
    } catch (err) {
  console.error('Upload error:', err);
  alert('Upload failed');
}
    finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this document?')) return;
    try {
      await deleteDocument(id);
      setDocs((prev) => prev.filter((d) => d._id !== id));
    } catch {
      alert('Delete failed');
    }
  };

  const handlePreview = (doc: Document) => {
    setPreviewDoc(doc);
    setPreviewUrl(`http://localhost:5000${doc.fileUrl}`);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) setSelectedFile(file);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });

  return (
    <div style={{ padding: '32px', maxWidth: '900px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600, margin: 0 }}>Documents</h1>
        <p style={{ color: '#6b7280', marginTop: '4px' }}>Upload, view and manage your documents</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {(['all', 'upload'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 500,
              background: activeTab === tab ? '#4f46e5' : '#f3f4f6',
              color: activeTab === tab ? '#fff' : '#374151',
            }}
          >
            {tab === 'all' ? 'My Documents' : 'Upload New'}
          </button>
        ))}
      </div>

      {/* Upload Tab */}
      {activeTab === 'upload' && (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '28px' }}>

          {/* Drag & Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? '#4f46e5' : '#d1d5db'}`,
              borderRadius: '10px',
              padding: '40px',
              textAlign: 'center',
              cursor: 'pointer',
              background: dragOver ? '#eef2ff' : '#fafafa',
              marginBottom: '20px',
              transition: 'all 0.2s',
            }}
          >
            <Upload size={32} color={dragOver ? '#4f46e5' : '#9ca3af'} style={{ marginBottom: '10px' }} />
            <p style={{ margin: 0, color: '#374151', fontWeight: 500 }}>
              {selectedFile ? selectedFile.name : 'Drag & drop or click to select file'}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#9ca3af' }}>
              PDF, DOC, DOCX, JPG, PNG — max 10MB
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              style={{ display: 'none' }}
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            />
          </div>

          {/* Title Input */}
          <input
            type="text"
            placeholder="Document title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              fontSize: '14px',
              marginBottom: '16px',
              boxSizing: 'border-box',
            }}
          />

          <button
            onClick={handleUpload}
            disabled={uploading}
            style={{
              width: '100%',
              padding: '11px',
              borderRadius: '8px',
              border: 'none',
              background: uploading ? '#a5b4fc' : '#4f46e5',
              color: '#fff',
              fontWeight: 600,
              fontSize: '15px',
              cursor: uploading ? 'not-allowed' : 'pointer',
            }}
          >
            {uploading ? 'Uploading...' : 'Upload Document'}
          </button>
        </div>
      )}

      {/* Documents List Tab */}
      {activeTab === 'all' && (
        <div>
          {loading ? (
            <p style={{ color: '#6b7280' }}>Loading documents...</p>
          ) : docs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af' }}>
              <FileText size={48} style={{ marginBottom: '12px' }} />
              <p>No documents yet. Upload your first one!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {docs.map((doc) => (
                <div
                  key={doc._id}
                  style={{
                    background: '#fff',
                    borderRadius: '10px',
                    border: '1px solid #e5e7eb',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ background: '#eef2ff', borderRadius: '8px', padding: '10px' }}>
                      <FileText size={22} color="#4f46e5" />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '15px' }}>{doc.title}</p>
                      <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6b7280' }}>
                        {formatSize(doc.size)} · {formatDate(doc.createdAt)}
                        {doc.signedAt && (
                          <span style={{ color: '#10b981', marginLeft: '8px' }}>
                            <CheckCircle size={12} style={{ verticalAlign: 'middle', marginRight: '3px' }} />
                            Signed
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handlePreview(doc)}
                      title="Preview"
                      style={{ background: '#f3f4f6', border: 'none', borderRadius: '6px', padding: '8px', cursor: 'pointer' }}
                    >
                      <Eye size={16} color="#374151" />
                    </button>
                    <button
                      title="Share"
                      style={{ background: '#f3f4f6', border: 'none', borderRadius: '6px', padding: '8px', cursor: 'pointer' }}
                    >
                      <Share2 size={16} color="#374151" />
                    </button>

      {/* ✅ Sign button — yahan add kiya */}
      {!doc.signedAt && (
        <button
          onClick={() => setSigningDoc(doc)}
          title="Sign"
          style={{ background: '#f0fdf4', border: 'none', borderRadius: '6px', padding: '8px', cursor: 'pointer' }}
        >
          <CheckCircle size={16} color="#10b981" />
        </button>
      )}
                    <button
                      onClick={() => handleDelete(doc._id)}
                      title="Delete"
                      style={{ background: '#fef2f2', border: 'none', borderRadius: '6px', padding: '8px', cursor: 'pointer' }}
                    >
                      <Trash2 size={16} color="#ef4444" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Preview Modal */}
      {previewUrl && previewDoc && (
        <div
          onClick={() => { setPreviewUrl(null); setPreviewDoc(null); }}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: '12px',
              width: '80vw', maxHeight: '85vh',
              overflow: 'hidden', display: 'flex', flexDirection: 'column',
            }}
          >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600 }}>{previewDoc.title}</span>
              <button
                onClick={() => { setPreviewUrl(null); setPreviewDoc(null); }}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#6b7280' }}
              >✕</button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '16px', background: '#f9fafb' }}>
              {previewDoc.mimeType === 'application/pdf' ? (
                <iframe
                  src={previewUrl}
                  style={{ width: '100%', height: '65vh', border: 'none', borderRadius: '8px' }}
                  title={previewDoc.title}
                />
              ) : previewDoc.mimeType.startsWith('image/') ? (
                <img
                  src={previewUrl}
                  alt={previewDoc.title}
                  style={{ maxWidth: '100%', borderRadius: '8px' }}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  <FileText size={48} style={{ marginBottom: '12px' }} />
                  <p>Preview not available for this file type.</p>
                  <a href={previewUrl} download style={{ color: '#4f46e5' }}>Download file</a>
                </div>
              )}
              {signingDoc && (
  <SignaturePad
    documentId={signingDoc._id}
    documentTitle={signingDoc.title}
    onClose={() => setSigningDoc(null)}
    onSigned={() => {
      setSigningDoc(null);
      fetchDocs();
    }}
  />
)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}