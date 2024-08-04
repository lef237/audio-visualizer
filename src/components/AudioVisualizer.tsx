"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";

type AudioContextType = typeof window.AudioContext;

const FFT_SIZE = 2048;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;
const MIN_VOLUME = 0;
const MAX_VOLUME = 2;
const VOLUME_STEP = 0.01;

function useAudioContext() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  const setupAudioContext = useCallback(() => {
    const AudioContextClass: AudioContextType =
      window.AudioContext || (window as any).webkitAudioContext;
    const audioContext = new AudioContextClass();
    audioContextRef.current = audioContext;

    const analyser = audioContext.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    analyserRef.current = analyser;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    dataArrayRef.current = dataArray;

    const gainNode = audioContext.createGain();
    gainNodeRef.current = gainNode;

    return { audioContext, analyser, gainNode, dataArray };
  }, []);

  return {
    audioContextRef,
    analyserRef,
    gainNodeRef,
    dataArrayRef,
    setupAudioContext,
  };
}

function useAudioVisualizer(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  analyserRef: React.RefObject<AnalyserNode>,
  dataArrayRef: React.RefObject<Uint8Array>
) {
  const drawVisualizer = useCallback(() => {
    if (!canvasRef.current || !analyserRef.current || !dataArrayRef.current)
      return;

    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext("2d");
    if (!canvasCtx) return;

    const draw = () => {
      if (!analyserRef.current || !dataArrayRef.current) return;

      requestAnimationFrame(draw);
      analyserRef.current.getByteTimeDomainData(dataArrayRef.current);

      canvasCtx.fillStyle = "rgb(0, 0, 0)";
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = "rgb(173, 216, 230)";
      canvasCtx.beginPath();

      const bufferLength = analyserRef.current.frequencyBinCount;
      const sliceWidth = (canvas.width * 1.0) / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArrayRef.current[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      canvasCtx.lineTo(canvas.width, canvas.height / 2);
      canvasCtx.stroke();
    };

    draw();
  }, [canvasRef, analyserRef, dataArrayRef]);

  return { drawVisualizer };
}

export default function AudioVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const {
    audioContextRef,
    analyserRef,
    gainNodeRef,
    dataArrayRef,
    setupAudioContext,
  } = useAudioContext();
  const { drawVisualizer } = useAudioVisualizer(
    canvasRef,
    analyserRef,
    dataArrayRef
  );
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [source, setSource] = useState<AudioBufferSourceNode | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(1);

  useEffect(() => {
    if (audioUrl && audioBuffer) {
      setupAudioContext();
      drawVisualizer();
    }
  }, [audioUrl, audioBuffer, setupAudioContext, drawVisualizer]);

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume;
    }
  }, [gainNodeRef, volume]);

  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();

      reader.onload = async (e) => {
        const arrayBuffer = e.target?.result;
        if (!arrayBuffer || !(arrayBuffer instanceof ArrayBuffer)) return;

        try {
          const AudioContextClass: AudioContextType =
            window.AudioContext || (window as any).webkitAudioContext;
          const audioContext = new AudioContextClass();
          setAudioUrl(URL.createObjectURL(file));
          audioContextRef.current = audioContext;

          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          setAudioBuffer(audioBuffer);
        } catch (error) {
          console.error("Error decoding audio data:", error);
        }
      };

      reader.readAsArrayBuffer(file);
    },
    [audioContextRef]
  );

  const handlePlayStop = useCallback(() => {
    if (!audioBuffer || !audioContextRef.current) return;

    if (isPlaying) {
      source?.stop();
      setIsPlaying(false);
    } else {
      const audioContext = audioContextRef.current;
      const analyser = analyserRef.current;
      const gainNode = gainNodeRef.current;

      if (!analyser || !gainNode) return;

      const newSource = audioContext.createBufferSource();
      newSource.buffer = audioBuffer;
      newSource.connect(analyser);
      analyser.connect(gainNode);
      gainNode.connect(audioContext.destination);
      newSource.start();
      setSource(newSource);
      setIsPlaying(true);

      newSource.onended = () => {
        setIsPlaying(false);
      };
    }
  }, [
    audioBuffer,
    audioContextRef,
    analyserRef,
    gainNodeRef,
    isPlaying,
    source,
  ]);

  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setVolume(parseFloat(e.target.value));
    },
    []
  );

  return (
    <div className="flex flex-col items-center space-y-4 p-4">
      <input
        type="file"
        accept="audio/*"
        onChange={handleFileUpload}
        className="p-2 border border-gray-300 rounded cursor-pointer"
      />
      <button
        onClick={handlePlayStop}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        {isPlaying ? "Stop" : "Play"}
      </button>
      <input
        type="range"
        min={MIN_VOLUME}
        max={MAX_VOLUME}
        step={VOLUME_STEP}
        value={volume}
        onChange={handleVolumeChange}
        className="w-full"
      />
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="border border-gray-300"
      ></canvas>
    </div>
  );
}
