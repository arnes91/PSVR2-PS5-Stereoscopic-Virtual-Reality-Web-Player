
import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';

/**
 * --- TypeScript Definitions ---
 */
// Fix for JSX intrinsic elements errors in React.
// We augment both the global JSX namespace and the React.JSX namespace to ensure
// compatibility across different React versions and compiler settings.
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'a-scene': any;
      'a-assets': any;
      'a-camera': any;
      'a-cursor': any;
      'a-entity': any;
      'a-videosphere': any;
      'a-video': any;
      'a-curvedimage': any;
    }
  }
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        'a-scene': any;
        'a-assets': any;
        'a-camera': any;
        'a-cursor': any;
        'a-entity': any;
        'a-videosphere': any;
        'a-video': any;
        'a-curvedimage': any;
      }
    }
  }
}

const initAFrameEngine = () => {
  const win = window as any;
  if (!win.AFRAME) return false;
  if (!win.AFRAME.materials || !win.AFRAME.registerComponent) return false;

  try {
    if (!win.AFRAME.components['stereo-layer']) {
      win.AFRAME.registerComponent('stereo-layer', {
        schema: { type: 'string', default: 'both' },
        init: function () {
          this.updateLayer = this.updateLayer.bind(this);
          this.el.addEventListener('loaded', this.updateLayer);
        },
        updateLayer: function () {
          const obj = this.el.getObject3D('mesh');
          if (!obj) return;
          obj.layers.disableAll();
          if (this.data === 'left') obj.layers.enable(1);
          else if (this.data === 'right') obj.layers.enable(2);
          else { obj.layers.enable(0); obj.layers.enable(1); obj.layers.enable(2); }
        }
      });
    }

    if (!win.AFRAME.components['video-handler']) {
      win.AFRAME.registerComponent('video-handler', {
        init: function () {
          this.el.addEventListener('click', () => {
            const v = document.querySelector('#content-video') as HTMLVideoElement;
            if (v) {
              if (v.paused) v.play().catch(e => console.error("Play Blocked:", e.message));
              else v.pause();
            }
          });
        }
      });
    }
    return true;
  } catch (e) {
    return false;
  }
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    position: 'absolute', zIndex: 100, top: 0, left: 0, width: '100%', height: '100%',
    backgroundColor: '#000', color: '#00ff41', display: 'flex', flexDirection: 'column',
    fontFamily: 'monospace', overflow: 'hidden'
  },
  topBar: {
    padding: '10px', background: '#080808', borderBottom: '1px solid #00ff41',
    display: 'flex', gap: '10px', alignItems: 'center'
  },
  mainSplit: { display: 'flex', flex: 1, overflow: 'hidden' },
  navSidebar: { width: '80px', display: 'flex', flexDirection: 'column', gap: '5px', padding: '5px', borderRight: '1px solid #222' },
  browserPane: { flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' },
  settingsSidebar: { width: '280px', padding: '15px', backgroundColor: '#050505', display: 'flex', flexDirection: 'column', gap: '15px' },
  iframe: { flex: 1, border: 'none', background: '#fff' },
  input: {
    flex: 1, padding: '12px', background: '#000', border: '1px solid #00ff41',
    color: '#00ff41', fontFamily: 'monospace', fontSize: '1rem'
  },
  btn: {
    padding: '10px', background: '#000', color: '#00ff41', border: '1px solid #00ff41',
    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center'
  },
  btnBig: { height: '60px', fontWeight: 'bold', background: '#00ff41', color: '#000' },
  btnNav: { height: '50px', fontSize: '1.2rem' },
  label: { fontSize: '0.7rem', opacity: 0.6, marginBottom: '-10px' },
  console: { height: '80px', background: '#000', borderTop: '1px solid #222', padding: '5px', fontSize: '0.65rem', overflowY: 'auto' }
};

const App = () => {
  const [url, setUrl] = useState('https://www.wikipedia.org');
  const [videoSrc, setVideoSrc] = useState('');
  const [uiVisible, setUiVisible] = useState(true);
  const [format, setFormat] = useState('180');
  const [stereo, setStereo] = useState('sbs');
  const [logs, setLogs] = useState<string[]>(["[SYS] Terminal Online."]);
  const [ready, setReady] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const log = (t: string, ...a: any[]) => setLogs(p => [...p.slice(-10), `[${t}] ${a.join(' ')}`]);
    console.error = (...a) => { log('ERR', ...a); };
    console.warn = (...a) => log('WRN', ...a);

    let tries = 0;
    const itv = setInterval(() => {
      if (initAFrameEngine()) { setReady(true); clearInterval(itv); }
      else if (++tries > 50) clearInterval(itv);
    }, 200);
    return () => clearInterval(itv);
  }, []);

  const launch = () => {
    if (!videoSrc) {
      console.error("NO_SOURCE: Use 'LINK AS VIDEO' or paste a direct URL.");
      return;
    }
    setUiVisible(false);
    const v = document.querySelector('#content-video') as HTMLVideoElement;
    if (v) { v.load(); v.play().catch(() => console.warn("CLICK SCENE TO START")); }
  };

  const syncUrlToVideo = () => {
    setVideoSrc(url);
    console.warn("Source synced. Launch when ready.");
  };

  const getStereo = (side: 'left' | 'right') => {
    if (stereo === 'mono') return 'repeat: 1 1; offset: 0 0';
    if (stereo === 'sbs') return side === 'left' ? 'repeat: 0.5 1; offset: 0 0' : 'repeat: 0.5 1; offset: 0.5 0';
    if (stereo === 'tb') return side === 'left' ? 'repeat: 1 0.5; offset: 0 0.5' : 'repeat: 1 0.5; offset: 0 0';
    return '';
  };

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative' }}>
      {/* HUD MENU */}
      <div style={{ ...styles.container, display: uiVisible ? 'flex' : 'none' }}>
        <div style={styles.topBar}>
          <div style={{ fontWeight: 'bold', fontSize: '1.2rem', marginRight: '20px' }}>PSVR.SHELL</div>
          <input style={styles.input} value={url} onChange={e => setUrl(e.target.value)} placeholder="Browse or Paste Direct .mp4 Link..." />
          <button style={{ ...styles.btn, width: '100px' }} onClick={() => setUrl(url)}>BROWSE</button>
          <button style={{ ...styles.btn, width: '140px', background: '#00ff41', color: '#000' }} onClick={syncUrlToVideo}>LINK AS VIDEO</button>
        </div>

        <div style={styles.mainSplit}>
          {/* NAVIGATION SIDEBAR (Console Friendly) */}
          <div style={styles.navSidebar}>
            <button style={{ ...styles.btn, ...styles.btnNav }} title="Home" onClick={() => setUrl('https://www.google.com')}>🏠</button>
            <button style={{ ...styles.btn, ...styles.btnNav }} title="Back" onClick={() => window.history.back()}>◀</button>
            <button style={{ ...styles.btn, ...styles.btnNav }} title="Forward" onClick={() => window.history.forward()}>▶</button>
            <div style={{ flex: 1 }} />
            <button style={{ ...styles.btn, fontSize: '0.6rem' }} onClick={() => setUrl('https://archive.org/details/movies')}>MOVIES</button>
          </div>

          <div style={styles.browserPane}>
            <iframe ref={iframeRef} src={url} style={styles.iframe} title="Web" />
          </div>

          <div style={styles.settingsSidebar}>
            <div style={styles.label}>VR SOURCE STATUS</div>
            <div style={{ padding: '10px', border: '1px solid #333', fontSize: '0.7rem', wordBreak: 'break-all', color: videoSrc ? '#00ff41' : '#444' }}>
              {videoSrc ? `READY: ${videoSrc}` : "NO VIDEO LOADED"}
            </div>

            <div style={styles.label}>PROJECTION</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '5px' }}>
              <button style={format === '2d' ? { ...styles.btn, background: '#00ff41', color: '#000' } : styles.btn} onClick={() => setFormat('2d')}>2D</button>
              <button style={format === '180' ? { ...styles.btn, background: '#00ff41', color: '#000' } : styles.btn} onClick={() => setFormat('180')}>180</button>
              <button style={format === '360' ? { ...styles.btn, background: '#00ff41', color: '#000' } : styles.btn} onClick={() => setFormat('360')}>360</button>
            </div>

            <div style={styles.label}>STEREO MODE</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '5px' }}>
              <button style={stereo === 'mono' ? { ...styles.btn, background: '#00ff41', color: '#000' } : styles.btn} onClick={() => setStereo('mono')}>MONO</button>
              <button style={stereo === 'sbs' ? { ...styles.btn, background: '#00ff41', color: '#000' } : styles.btn} onClick={() => setStereo('sbs')}>SBS</button>
              <button style={stereo === 'tb' ? { ...styles.btn, background: '#00ff41', color: '#000' } : styles.btn} onClick={() => setStereo('tb')}>T/B</button>
            </div>

            <button
              style={{ ...styles.btn, ...styles.btnBig, opacity: (!videoSrc || !ready) ? 0.3 : 1 }}
              onClick={launch}
              disabled={!videoSrc || !ready}
            >
              INITIALIZE PSVR PLAYER
            </button>

            <div style={{ marginTop: 'auto', fontSize: '0.6rem', opacity: 0.4 }}>
              * Most sites block iframes. Paste direct .mp4 links for best results.
            </div>
          </div>
        </div>

        <div style={styles.console}>
          {logs.map((m, i) => <div key={i} style={{ color: m.includes('ERR') ? '#ff4141' : '#00ff41' }}>{m}</div>)}
        </div>
      </div>

      {/* VR HUD TOGGLE */}
      {!uiVisible && (
        <button
          onClick={() => setUiVisible(true)}
          style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 1000, background: 'rgba(0,0,0,0.8)', color: '#00ff41', border: '1px solid #00ff41', padding: '12px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          MENU
        </button>
      )}

      {/* PERSISTENT WEBGL SCENE */}
      <div style={{ width: '100%', height: '100%', visibility: (ready && !uiVisible) ? 'visible' : 'hidden' }}>
        <a-scene embedded vr-mode-ui="enabled: true" renderer="antialias: false; webgl2: false; precision: mediump;">
          <a-assets>
            <video id="content-video" src={videoSrc} loop crossOrigin="anonymous" playsInline style={{ display: 'none' }} />
          </a-assets>

          <a-camera position="0 1.6 0" look-controls="reverseMouseDrag: true">
            <a-cursor color="#00ff41" scale="0.5 0.5 0.5" raycaster="objects: .clickable"></a-cursor>
          </a-camera>

          <a-entity>
            {format === '360' && (
              <a-entity rotation="0 -90 0">
                <a-videosphere src="#content-video" stereo-layer="left" material={getStereo('left')} class="clickable" video-handler></a-videosphere>
                <a-videosphere src="#content-video" stereo-layer="right" material={