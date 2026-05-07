import React, { useRef, useEffect, useState } from 'react';

const VeloProductVideo = ({ videoUrl, thumbnailUrl, altText }) => {
  const videoRef = useRef(null);
  const [isIntersecting, setIntersecting] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIntersecting(entry.isIntersecting),
      { threshold: 0.2 } // Ativa quando 20% do vídeo aparece na tela
    );
    if (videoRef.current) observer.observe(videoRef.current);
    return () => observer.disconnect();
  }, []);

  // Otimização dinâmica via Cloudinary para economizar banda (f_auto, q_auto)
  const optimizedVideo = videoUrl.replace('/upload/', '/upload/f_auto,q_auto,w_600,c_fill,ar_1:1/');

  return (
    <div className="relative w-full aspect-square overflow-hidden rounded-lg bg-slate-100">
      {!isIntersecting && (
        <img 
          src={thumbnailUrl} 
          alt={altText} 
          className="absolute inset-0 w-full h-full object-cover blur-[2px]" 
        />
      )}
      <video
        ref={videoRef}
        src={isIntersecting ? optimizedVideo : ""}
        poster={thumbnailUrl}
        muted
        loop
        playsInline
        autoPlay
        className={`w-full h-full object-cover transition-opacity duration-500 ${isIntersecting ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
};

export default VeloProductVideo;