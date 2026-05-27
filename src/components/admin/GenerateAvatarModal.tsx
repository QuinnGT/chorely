'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AVATAR_PRESETS,
  AVATAR_QUALITIES,
  AVATAR_STYLES,
  type PresetId,
  type QualityId,
  type StyleId,
} from '@/lib/avatar-presets';
import { resizeImage } from '@/lib/resize-image';

interface Props {
  onClose: () => void;
  onSave: (url: string) => void;
}

type Source = 'describe' | 'photo';

export function GenerateAvatarModal({ onClose, onSave }: Props) {
  const [source, setSource] = useState<Source>('photo');
  const [preset, setPreset] = useState<PresetId>('astronaut');
  const [style, setStyle] = useState<StyleId>('painted-hero');
  const [quality, setQuality] = useState<QualityId>('fast');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const captureInputRef = useRef<HTMLInputElement>(null);

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  useEffect(() => {
    if (isCameraOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      void videoRef.current.play().catch(() => undefined);
    }
  }, [isCameraOpen]);

  const consumeFile = useCallback(
    async (original: File) => {
      setError(null);
      try {
        const resized = await resizeImage(original, 1024);
        setPhotoFile(resized);
        if (photoPreview) URL.revokeObjectURL(photoPreview);
        setPhotoPreview(URL.createObjectURL(resized));
        setPreviewUrl(null);
      } catch {
        setError('Could not read photo');
      }
    },
    [photoPreview],
  );

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const original = e.target.files?.[0];
    if (original) await consumeFile(original);
    e.target.value = '';
  };

  const openCamera = async () => {
    setError(null);
    const supportsGetUserMedia =
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function';

    if (!supportsGetUserMedia) {
      captureInputRef.current?.click();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 1280 },
        },
        audio: false,
      });
      streamRef.current = stream;
      setIsCameraOpen(true);
    } catch {
      captureInputRef.current?.click();
    }
  };

  const captureFromCamera = async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;

    const size = Math.min(video.videoWidth, video.videoHeight);
    if (size === 0) return;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const sx = (video.videoWidth - size) / 2;
    const sy = (video.videoHeight - size) / 2;
    ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.92),
    );
    if (!blob) return;
    const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });
    stopCamera();
    await consumeFile(file);
  };

  const handleClearPhoto = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(null);
    setPhotoPreview(null);
    setPreviewUrl(null);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      let res: Response;
      if (source === 'photo') {
        if (!photoFile) {
          setError('Add a photo first');
          return;
        }
        const form = new FormData();
        form.append('photo', photoFile);
        form.append('preset', preset);
        form.append('style', style);
        form.append('quality', quality);
        res = await fetch('/api/avatars/generate-from-photo', {
          method: 'POST',
          body: form,
        });
      } else {
        res = await fetch('/api/avatars/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ preset, style, quality }),
        });
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Generation failed' }));
        setError(err.error || 'Generation failed');
        return;
      }
      const { url } = await res.json();
      setPreviewUrl(url);
    } catch {
      setError('Failed to generate');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    if (previewUrl) {
      onSave(previewUrl);
      onClose();
    }
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  const canGenerate = source === 'describe' || !!photoFile;

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      onClick={handleClose}
    >
      <div
        className="animate-bounce-in w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[3rem] p-8"
        style={{
          background: 'var(--surface-container-lowest)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold" style={{ color: 'var(--on-surface)' }}>
            Generate Avatar
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-2xl leading-none"
            style={{ color: 'var(--on-surface-variant)' }}
          >
            ×
          </button>
        </div>

        <div className="mb-6">
          <div
            className="mb-2 text-sm font-medium"
            style={{ color: 'var(--on-surface-variant)' }}
          >
            Source
          </div>
          <div className="flex gap-2">
            {(['photo', 'describe'] as const).map((s) => {
              const selected = source === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setSource(s);
                    setPreviewUrl(null);
                    setError(null);
                    if (s !== 'photo') stopCamera();
                  }}
                  className="flex-1 rounded-full px-3 py-2 text-sm font-medium transition-transform active:scale-95"
                  style={{
                    background: selected
                      ? 'var(--primary)'
                      : 'var(--surface-container-low)',
                    color: selected ? 'var(--on-primary)' : 'var(--on-surface-variant)',
                    border: selected
                      ? '1px solid var(--primary)'
                      : '1px solid var(--outline-variant)',
                  }}
                >
                  {s === 'describe' ? '✨ Describe' : '📷 From Photo'}
                </button>
              );
            })}
          </div>
        </div>

        {source === 'photo' && (
          <div className="mb-6">
            <div
              className="mb-2 text-sm font-medium"
              style={{ color: 'var(--on-surface-variant)' }}
            >
              Selfie
            </div>

            <input
              ref={uploadInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <input
              ref={captureInputRef}
              type="file"
              accept="image/*"
              capture="user"
              onChange={handleFileInputChange}
              className="hidden"
            />

            {isCameraOpen ? (
              <div className="flex flex-col items-center gap-3">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="h-56 w-56 rounded-3xl object-cover"
                  style={{ border: '1px solid var(--outline-variant)', background: '#000' }}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={captureFromCamera}
                    className="rounded-full px-4 py-2 text-sm font-semibold transition-transform active:scale-95"
                    style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}
                  >
                    Capture
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="rounded-full px-4 py-2 text-sm font-medium transition-transform active:scale-95"
                    style={{
                      background: 'var(--surface-container-low)',
                      color: 'var(--on-surface-variant)',
                      border: '1px solid var(--outline-variant)',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : photoPreview ? (
              <div className="flex flex-col items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoPreview}
                  alt="Selfie preview"
                  className="h-40 w-40 rounded-3xl object-cover"
                  style={{ border: '1px solid var(--outline-variant)' }}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={openCamera}
                    className="rounded-full px-4 py-1.5 text-sm font-medium transition-transform active:scale-95"
                    style={{
                      background: 'var(--surface-container-low)',
                      color: 'var(--on-surface-variant)',
                      border: '1px solid var(--outline-variant)',
                    }}
                  >
                    Retake
                  </button>
                  <button
                    type="button"
                    onClick={() => uploadInputRef.current?.click()}
                    className="rounded-full px-4 py-1.5 text-sm font-medium transition-transform active:scale-95"
                    style={{
                      background: 'var(--surface-container-low)',
                      color: 'var(--on-surface-variant)',
                      border: '1px solid var(--outline-variant)',
                    }}
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={handleClearPhoto}
                    className="rounded-full px-4 py-1.5 text-sm font-medium transition-transform active:scale-95"
                    style={{
                      background: 'var(--surface-container-low)',
                      color: 'var(--error)',
                      border: '1px solid var(--outline-variant)',
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={openCamera}
                    className="flex flex-1 flex-col items-center justify-center gap-1 rounded-3xl border-2 border-dashed px-4 py-5 transition-transform active:scale-95"
                    style={{
                      borderColor: 'var(--outline-variant)',
                      background: 'var(--surface-container-low)',
                      color: 'var(--on-surface-variant)',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>
                      photo_camera
                    </span>
                    <span className="text-sm font-semibold">Take Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => uploadInputRef.current?.click()}
                    className="flex flex-1 flex-col items-center justify-center gap-1 rounded-3xl border-2 border-dashed px-4 py-5 transition-transform active:scale-95"
                    style={{
                      borderColor: 'var(--outline-variant)',
                      background: 'var(--surface-container-low)',
                      color: 'var(--on-surface-variant)',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>
                      upload
                    </span>
                    <span className="text-sm font-semibold">Upload</span>
                  </button>
                </div>
                <p
                  className="text-center text-xs"
                  style={{ color: 'var(--on-surface-variant)' }}
                >
                  Source photo is not saved
                </p>
              </div>
            )}
          </div>
        )}

        <div className="mb-6">
          <div
            className="mb-2 text-sm font-medium"
            style={{ color: 'var(--on-surface-variant)' }}
          >
            Character
          </div>
          <div className="flex flex-wrap gap-2">
            {AVATAR_PRESETS.map((p) => {
              const selected = preset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPreset(p.id)}
                  className="rounded-full px-3 py-1.5 text-sm font-medium transition-transform active:scale-95"
                  style={{
                    background: selected
                      ? 'var(--primary)'
                      : 'var(--surface-container-low)',
                    color: selected ? 'var(--on-primary)' : 'var(--on-surface-variant)',
                    border: selected
                      ? '1px solid var(--primary)'
                      : '1px solid var(--outline-variant)',
                  }}
                >
                  {p.emoji} {p.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-6">
          <div
            className="mb-2 text-sm font-medium"
            style={{ color: 'var(--on-surface-variant)' }}
          >
            Style
          </div>
          <div className="flex flex-wrap gap-2">
            {AVATAR_STYLES.map((s) => {
              const selected = style === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStyle(s.id)}
                  title={s.hint}
                  className="rounded-full px-3 py-1.5 text-sm font-medium transition-transform active:scale-95"
                  style={{
                    background: selected
                      ? 'var(--primary)'
                      : 'var(--surface-container-low)',
                    color: selected ? 'var(--on-primary)' : 'var(--on-surface-variant)',
                    border: selected
                      ? '1px solid var(--primary)'
                      : '1px solid var(--outline-variant)',
                  }}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-6">
          <div
            className="mb-2 text-sm font-medium"
            style={{ color: 'var(--on-surface-variant)' }}
          >
            Speed
          </div>
          <div className="flex flex-wrap gap-2">
            {AVATAR_QUALITIES.map((q) => {
              const selected = quality === q.id;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setQuality(q.id)}
                  className="rounded-full px-3 py-1.5 text-sm font-medium transition-transform active:scale-95"
                  style={{
                    background: selected
                      ? 'var(--primary)'
                      : 'var(--surface-container-low)',
                    color: selected ? 'var(--on-primary)' : 'var(--on-surface-variant)',
                    border: selected
                      ? '1px solid var(--primary)'
                      : '1px solid var(--outline-variant)',
                  }}
                  title={q.hint}
                >
                  {q.label}
                </button>
              );
            })}
          </div>
        </div>

        {previewUrl && (
          <div className="mb-6 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Generated avatar preview"
              className="h-48 w-48 rounded-3xl object-cover"
              style={{ border: '1px solid var(--outline-variant)' }}
            />
          </div>
        )}

        {error && (
          <div
            className="mb-4 rounded-2xl p-3 text-sm"
            style={{ background: 'var(--error-container)', color: 'var(--on-error-container)' }}
          >
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || !canGenerate}
            className="flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-transform active:scale-95 disabled:opacity-50"
            style={{
              background: 'var(--surface-container-low)',
              color: 'var(--on-surface-variant)',
              border: '1px solid var(--outline-variant)',
            }}
          >
            {isGenerating ? 'Generating…' : previewUrl ? 'Try Again' : 'Generate'}
          </button>
          {previewUrl && (
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-transform active:scale-95"
              style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}
            >
              Use This
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
