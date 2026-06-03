// src/pages/video/VideoCallPage.tsx
import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

interface RTCPeerConnectionWithPeerId extends RTCPeerConnection {
  _targetPeerId?: string;
}

export default function VideoCallPage() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // ✅ 1. Saare refs pehle
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnectionWithPeerId | null>(null); // ✅ type fix
  const localStreamRef = useRef<MediaStream | null>(null);

  // ✅ 2. Phir saare states
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [callStatus, setCallStatus] = useState<'connecting' | 'waiting' | 'in-call' | 'ended'>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [remoteAudioEnabled, setRemoteAudioEnabled] = useState(true);
  const [peerLeft, setPeerLeft] = useState(false);

  // ✅ 3. createPeerConnection
  const createPeerConnection = useCallback((stream: MediaStream): RTCPeerConnectionWithPeerId => {
    const pc: RTCPeerConnectionWithPeerId = new RTCPeerConnection(ICE_SERVERS);

    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setCallStatus('in-call');
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        const targetId = pc._targetPeerId;
        if (targetId) {
          socketRef.current.emit('ice-candidate', { to: targetId, candidate: event.candidate });
        }
      }
    };

    return pc;
  }, []);

  // ✅ 4. Verify meeting useEffect
  useEffect(() => {
    const verifyMeeting = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`http://localhost:5000/api/meetings/${meetingId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          setAuthorized(false);
          return;
        }

        const data = await res.json();
        const meeting = data.meeting;

        if (meeting.status !== 'accepted') {
          setAuthorized(false);
          setError('Yeh meeting accepted nahi hai.');
          return;
        }

        const myId = user?.id;
        const isParticipant =
          meeting.requester._id === myId || meeting.recipient._id === myId;

        if (!isParticipant) {
          setAuthorized(false);
          setError('Aap is call ke participant nahi hain.');
          return;
        }

        const startTime = new Date(meeting.startTime).getTime();
        const now = Date.now();
        const tenMinutes = 10 * 60 * 1000;

        if (now < startTime - tenMinutes) {
          setAuthorized(false);
          setError(
            `Call ${new Date(meeting.startTime).toLocaleTimeString()} se sirf 10 minute pehle join ho sakti hai.`
          );
          return;
        }

        setAuthorized(true);
      } catch {
        setAuthorized(false);
        setError('Meeting verify karne mein masla aaya.');
      }
    };

    if (meetingId && user) verifyMeeting();
  }, [meetingId, user]);

  // ✅ 5. Camera + socket useEffect — authorized hone ke baad
  useEffect(() => {
    if (!meetingId || !authorized) return;

    let mounted = true;

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!mounted) return;

        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const socket = io('http://localhost:5000', { withCredentials: true });
        socketRef.current = socket;

        socket.on('connect', () => {
          socket.emit('join-room', meetingId);
          setCallStatus('waiting');
        });

        socket.on('room-peers', async (peers: string[]) => {
          if (peers.length === 0) return;
          const peerId = peers[0];
          const pc = createPeerConnection(stream);
          pc._targetPeerId = peerId;
          pcRef.current = pc;

          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('offer', { to: peerId, offer });
        });

        socket.on('peer-joined', () => {
          // offer handler handle karega
        });

        socket.on('offer', async ({ from, offer }: { from: string; offer: RTCSessionDescriptionInit }) => {
          const pc = createPeerConnection(stream);
          pc._targetPeerId = from;
          pcRef.current = pc;

          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('answer', { to: from, answer });
        });

        socket.on('answer', async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
          await pcRef.current?.setRemoteDescription(new RTCSessionDescription(answer));
        });

        socket.on('ice-candidate', async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
          try {
            await pcRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.error('ICE error', e);
          }
        });

      socket.on('peer-left', () => {
  if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  setCallStatus('waiting');
  setPeerLeft(true);

  

});

      } catch (err: unknown) {
        if (mounted) {
          const message = err instanceof Error ? err.message : 'Could not access camera/microphone';
          setError(message);
        }
      }
    }; // ✅ start function yahan band hota hai

    start();

    return () => {
      mounted = false;
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      pcRef.current?.close();
      socketRef.current?.disconnect();
    };
  }, [meetingId, authorized, createPeerConnection]);

  // ✅ 6. Functions
  const toggleAudio = () => {
    if (!localStreamRef.current) return;
    const track = localStreamRef.current.getAudioTracks()[0];
    console.log('Audio track:', track);
    if (track) { track.enabled = !track.enabled; setAudioEnabled(track.enabled); }
  };

  const toggleVideo = () => {
    if (!localStreamRef.current) return;
    const track = localStreamRef.current.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; setVideoEnabled(track.enabled); }
  };
  const toggleRemoteAudio = () => {
  if (remoteVideoRef.current) {
    remoteVideoRef.current.muted = !remoteVideoRef.current.muted;
    setRemoteAudioEnabled(prev => !prev);
  }
};

  const endCall = () => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    pcRef.current?.close();
    socketRef.current?.disconnect();
    setCallStatus('ended');
    navigate(-1);
  };

  // ✅ 7. Screens
  if (authorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center text-white">
          <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg">Meeting verify ho rahi hai...</p>
        </div>
      </div>
    );
  }

  if (authorized === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center text-white">
          <p className="text-4xl mb-4">⛔</p>
          <p className="text-xl font-semibold mb-2">Access Denied</p>
          <p className="text-gray-400 mb-6">{error || 'Yeh call abhi available nahi hai.'}</p>
          <button onClick={() => navigate(-1)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center text-white">
          <p className="text-xl mb-4">⚠️ {error}</p>
          <button onClick={() => navigate(-1)} className="px-4 py-2 bg-gray-700 rounded-lg">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <div className="flex-1 relative flex items-center justify-center">
        <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />

    {callStatus === 'waiting' && (
  <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
    <div className="text-center text-white">
      <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-lg">
        {/* ✅ Dono cases handle karo */}
        {remoteVideoRef.current?.srcObject 
          ? 'Waiting for the other person to join...'
          : 'Other person has left the call...'}
      </p>
      <p className="text-sm text-gray-400 mt-2">
        {remoteVideoRef.current?.srcObject 
          ? 'Share the meeting link with them'
          : 'Returning in 3 seconds...'}
      </p>
    </div>
  </div>
)}

        <div className="absolute top-4 right-4 w-40 h-28 bg-gray-800 rounded-xl overflow-hidden border-2 border-gray-600">
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          {!videoEnabled && (
            <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
              <span className="text-gray-400 text-xs">Camera off</span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-gray-800 py-4 px-8 flex items-center justify-center gap-6">
        <button
          onClick={toggleAudio}
          className={`w-14 h-14 rounded-full flex items-center justify-center text-xl transition-colors ${
            audioEnabled ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-red-600 hover:bg-red-500 text-white'
          }`}
        >
          {audioEnabled ? '🎙️' : '🔇'}
        </button>
        {/* Speaker toggle — doosre ki awaaz */}
<button
  onClick={toggleRemoteAudio}
  className={`w-14 h-14 rounded-full flex items-center justify-center text-xl transition-colors ${
    remoteAudioEnabled ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-red-600 hover:bg-red-500 text-white'
  }`}
  title={remoteAudioEnabled ? 'Speaker off' : 'Speaker on'}
>
  {remoteAudioEnabled ? '🔊' : '🔇'}
</button>
        <button
          onClick={toggleVideo}
          className={`w-14 h-14 rounded-full flex items-center justify-center text-xl transition-colors ${
            videoEnabled ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-red-600 hover:bg-red-500 text-white'
          }`}
        >
          {videoEnabled ? '📷' : '🚫'}
        </button>
        <button
          onClick={endCall}
          className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 text-white text-2xl flex items-center justify-center transition-colors"
        >
          📵
        </button>
      </div>
    </div>
  );
}