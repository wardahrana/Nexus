import { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { signDocument } from '../../services/documentAPI';

interface Props {
  documentId: string;
  documentTitle: string;
  onClose: () => void;
  onSigned: () => void;
}

export default function SignaturePad({ documentId, documentTitle, onClose, onSigned }: Props) {
  const sigRef = useRef<SignatureCanvas>(null);
  const [signing, setSigning] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  const handleClear = () => {
    sigRef.current?.clear();
    setIsEmpty(true);
  };

  const handleSign = async () => {
    if (!sigRef.current || sigRef.current.isEmpty()) {
      return alert('Please draw your signature first');
    }

   const signatureImageBase64 = sigRef.current
  .getCanvas()
  .toDataURL('image/png');

    setSigning(true);
    try {
      await signDocument(documentId, signatureImageBase64);
      onSigned();
      onClose();
    } catch {
      alert('Signing failed. Please try again.');
    } finally {
      setSigning(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1100,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: '14px',
          width: '520px', padding: '28px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Sign Document</h2>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '13px' }}>
            {documentTitle}
          </p>
        </div>

        {/* Canvas */}
        <div style={{
          border: '2px dashed #d1d5db',
          borderRadius: '10px',
          overflow: 'hidden',
          background: '#f9fafb',
          marginBottom: '8px',
        }}>
          <SignatureCanvas
            ref={sigRef}
            penColor="#1e293b"
            canvasProps={{
              width: 464,
              height: 200,
              style: { display: 'block' },
            }}
            onBegin={() => setIsEmpty(false)}
          />
        </div>

        <p style={{ margin: '0 0 20px', fontSize: '12px', color: '#9ca3af', textAlign: 'center' }}>
          Draw your signature above
        </p>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleClear}
            style={{
              flex: 1, padding: '10px',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              background: '#fff',
              color: '#374151',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Clear
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '10px',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              background: '#fff',
              color: '#374151',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSign}
            disabled={signing || isEmpty}
            style={{
              flex: 2, padding: '10px',
              borderRadius: '8px',
              border: 'none',
              background: signing || isEmpty ? '#a5b4fc' : '#4f46e5',
              color: '#fff',
              fontWeight: 600,
              cursor: signing || isEmpty ? 'not-allowed' : 'pointer',
            }}
          >
            {signing ? 'Signing...' : 'Sign Document'}
          </button>
        </div>
      </div>
    </div>
  );
}