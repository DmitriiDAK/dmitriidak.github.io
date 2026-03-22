/* ═══════════════════════════════════════════════════════════════
   CAT RUNNER  ·  Phaser 3 Easter Egg Game
   ═══════════════════════════════════════════════════════════════
   INTEGRATION GUIDE:
   1. Copy <div id="cat-game-overlay"> block to your HTML
   2. Copy the CSS rules for #cat-game-overlay and #cat-game canvas
   3. Include Phaser CDN link and this <script> block
   4. Trigger with:  CatGame.show()  / CatGame.hide()
   5. The #cat-egg-trigger button is optional — wire your own button
   ═══════════════════════════════════════════════════════════════ */

const CatGame = (() => {

  /* ── Layout ───────────────────────────────────────────────── */
  const GW = 800, GH = 360;
  const SKY_BOTTOM  = 150;   // sky → wall boundary (y)
  const GROUND_TOP  = 300;   // wall → floor boundary (y) = cat feet line
  const CAT_X       = 115;   // cat fixed x position

  /* ── Physics & pacing ─────────────────────────────────────── */
  const GRAVITY   = 1150;
  const JUMP_VEL  = -660;
  const BASE_SPD  = 300;   // px/s at start
  const MAX_SPD   = 700;   // px/s maximum
  const SPD_K     = 0.04;  // speed growth per metre
  const DIST_K    = 10;    // px/s ÷ DIST_K = metres/sec  (300/10 = 30 m/s)
  const MAX_DIST  = 10000; // metres to win

  /* ── Colour palette ───────────────────────────────────────── */
  const P = {
    /* cat */
    CO: 0xE07840, CD: 0xB85830, CI: 0xFFB0A0,
    CE: 0x1E4020, CU: 0x080808, CG: 0xFFFFFF, CN: 0xFF9090,
    /* furniture */
    W1: 0xA0622A, W2: 0x7A4820, W3: 0xC47840,
    S1: 0xA82020, S2: 0xC03030, S3: 0xD04040,
    R1: 0x3A5080, R2: 0x2A3860, R3: 0x4A6090,
    GL: 0xD4AF37,
    /* sky / nature */
    SK: 0x87C5E8, SN: 0xFFDD00, SR: 0xFFAA00,
    MN: 0xFFF5D0, CW: 0xF5F5F5, CG2: 0xDDDDDD,
    /* env */
    WB: 0xEDD5B0, WD: 0xCDB890,
    FB: 0x9B7D5A, FD: 0x785D3A,
    BS: 0xF2EAD8, BH: 0xE0D4C0,
    /* paper */
    PP: 0xF5F0DC, PD: 0xD8C8A0,
  };

  /* ── Tiny helpers ─────────────────────────────────────────── */
  function lerp(a, b, t) { return a + (b - a) * Math.max(0, Math.min(1, t)); }
  function hexLerp(c1, c2, t) {
    const r1=(c1>>16)&0xFF, g1=(c1>>8)&0xFF, b1=c1&0xFF;
    const r2=(c2>>16)&0xFF, g2=(c2>>8)&0xFF, b2=c2&0xFF;
    return (Math.round(lerp(r1,r2,t))<<16)|(Math.round(lerp(g1,g2,t))<<8)|Math.round(lerp(b1,b2,t));
  }

  function mkTex(scene, key, fn, w, h) {
    if (scene.textures.exists(key)) return;   // already cached — skip on restart
    const g = scene.make.graphics({ add: false });
    fn(g);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  /* ══════════════════════════════════════════════════════════════
     MAIN SCENE
  ══════════════════════════════════════════════════════════════ */
  class GameScene extends Phaser.Scene {
    constructor() { super({ key: 'Game' }); }

    create() {
      this._buildTextures();
      this._initState();
      this._buildBg();
      this._buildCat();
      this._buildUI();
      this._buildInput();
    }

    /* ── State ──────────────────────────────────────────────── */
    _initState() {
      this.dist   = 0;
      this.spd    = BASE_SPD;
      this.over   = false;
      this.won    = false;
      this.spawnT = 0;
      this.nextSp = 1600;
      this.dakT   = 0;
      this.dakD   = Phaser.Math.Between(5000, 13000);
      this.objs   = [];      // { spr, hw, hh }  (half-width/height for AABB)
      this.moonSp = null;
      this.sunRot = 0;
    }

    /* ── Texture factory ────────────────────────────────────── */
    _buildTextures() {
      this._txCat();
      this._txSunMoon();
      this._txClouds();
      this._txFurniture();
      this._txPaper();
      this._txPaintings();
      this._txBowl();
      this._txXmas();
      this._txUI();
      this._txEnv();
    }

    /* CAT — 56×52 canvas, 4 run frames + 1 jump */
    _txCat() {
      const frames = [
        { fl: 33, bl: 37 }, { fl: 37, bl: 33 },
        { fl: 31, bl: 39 }, { fl: 39, bl: 31 },
      ];
      frames.forEach(({ fl, bl }, i) =>
        mkTex(this, `cr${i}`, g => this._catDraw(g, fl, bl, false), 56, 52));
      mkTex(this, 'cj', g => this._catDraw(g, 30, 30, true), 56, 52);

      this.anims.create({
        key: 'run',
        frames: [0,1,2,3].map(i => ({ key:`cr${i}` })),
        frameRate: 10, repeat: -1,
      });
    }

    _catDraw(g, fl, bl, jump) {
      const [O,D,I,E,U,GL,N] = [P.CO,P.CD,P.CI,P.CE,P.CU,P.CG,P.CN];
      /* tail */
      g.fillStyle(O);
      g.fillRect(0,24,7,5); g.fillRect(2,18,6,8); g.fillRect(5,12,6,8);
      /* back leg */
      g.fillStyle(D);
      g.fillRect(13,bl,11,14);
      g.fillRect(11,bl+11,14,5);
      /* body */
      g.fillStyle(O);
      g.fillRect(9,22,38,20); g.fillRect(11,18,34,6);
      /* stripes */
      g.fillStyle(D);
      g.fillRect(17,22,3,14); g.fillRect(25,22,3,16); g.fillRect(33,22,3,14);
      /* front leg */
      g.fillStyle(O); g.fillRect(35,fl,11,14);
      g.fillStyle(D); g.fillRect(33,fl+11,14,5);
      /* neck */
      g.fillStyle(O); g.fillRect(21,13,14,11);
      /* head */
      g.fillStyle(O);
      g.fillRect(13,2,30,22); g.fillRect(15,0,26,24);
      /* ears */
      g.fillStyle(O);
      g.fillRect(15,0,9,8); g.fillRect(32,0,9,8);
      g.fillStyle(I);
      g.fillRect(16,1,6,5); g.fillRect(33,1,6,5);
      /* eyes */
      g.fillStyle(E);
      if (jump) {
        g.fillRect(19,10,9,9); g.fillRect(30,10,9,9);
        g.fillStyle(U); g.fillRect(21,12,5,5); g.fillRect(32,12,5,5);
      } else {
        g.fillRect(19,11,9,7); g.fillRect(30,11,9,7);
        g.fillStyle(U); g.fillRect(21,12,5,5); g.fillRect(32,12,5,5);
      }
      /* gleam */
      g.fillStyle(GL); g.fillRect(22,11,2,2); g.fillRect(33,11,2,2);
      /* nose */
      g.fillStyle(N); g.fillRect(25,19,6,4);
      /* mouth */
      g.fillStyle(D); g.fillRect(23,23,4,2); g.fillRect(29,23,4,2);
      /* whiskers */
      g.fillStyle(GL);
      g.fillRect(3,18,12,1); g.fillRect(3,21,12,1);
      g.fillRect(41,18,12,1); g.fillRect(41,21,12,1);
      /* belly */
      g.fillStyle(I); g.fillRect(20,30,16,8);
    }

    /* SUN — 64×64, MOON — 64×64 */
    _txSunMoon() {
      mkTex(this, 'sun', g => {
        /* glow */
        g.fillStyle(0xFFEE88, 0.18); g.fillCircle(32,32,31);
        /* rays (8 pairs) */
        for (let i = 0; i < 8; i++) {
          const a = (i/8)*Math.PI*2;
          const x1=32+Math.cos(a)*22, y1=32+Math.sin(a)*22;
          const x2=32+Math.cos(a)*30, y2=32+Math.sin(a)*30;
          g.fillStyle(P.SR);
          g.fillRect(Math.min(x1,x2)-2,Math.min(y1,y2)-2,
                     Math.abs(x2-x1)+4, Math.abs(y2-y1)+4);
        }
        g.fillStyle(P.SN); g.fillCircle(32,32,18);
        g.fillStyle(0xFFFF99); g.fillCircle(26,27,6);
      }, 64, 64);

      mkTex(this, 'moon', g => {
        g.fillStyle(P.MN); g.fillCircle(32,32,22);
        /* crescent cutout — will be drawn over sky color */
        g.fillStyle(0x0A1432); g.fillCircle(42,27,18);
        /* craters */
        g.fillStyle(0xEEE4BE);
        g.fillCircle(20,30,3); g.fillCircle(15,38,4); g.fillCircle(27,40,2);
      }, 64, 64);
    }

    /* CLOUDS — 3 variants */
    _txClouds() {
      [
        g => { g.fillStyle(P.CW); g.fillCircle(18,22,14); g.fillCircle(32,17,17); g.fillCircle(46,22,13); g.fillRect(10,22,42,14); g.fillStyle(P.CG2); g.fillRect(12,28,38,5); },
        g => { g.fillStyle(P.CW); g.fillCircle(22,22,12); g.fillCircle(42,16,16); g.fillCircle(62,20,13); g.fillRect(15,20,54,14); },
        g => { g.fillStyle(P.CW); g.fillCircle(16,24,13); g.fillCircle(28,16,15); g.fillCircle(40,22,12); g.fillRect(10,22,36,14); g.fillStyle(P.CG2); g.fillRect(12,28,32,5); },
      ].forEach((fn, i) => mkTex(this, `cl${i}`, fn, 96, 44));
    }

    /* FURNITURE — 4 types */
    _txFurniture() {
      /* TABLE 82×54 */
      mkTex(this, 'table', g => {
        g.fillStyle(P.W3); g.fillRect(0,0,82,11);
        g.fillStyle(P.W1); g.fillRect(2,2,78,7);
        g.fillStyle(P.W2);
        g.fillRect(7,11,10,43); g.fillRect(65,11,10,43);
        g.fillStyle(P.W1); g.fillRect(17,30,48,6);
        g.fillStyle(P.W2); g.fillRect(7,11,3,43); g.fillRect(65,11,3,43);
      }, 82, 54);

      /* CHAIR 54×62 */
      mkTex(this, 'chair', g => {
        g.fillStyle(P.W2);
        g.fillRect(4,0,8,62); g.fillRect(42,0,8,62);
        g.fillStyle(P.W1); g.fillRect(2,25,50,8);
        g.fillStyle(P.W3); g.fillRect(4,25,46,6);
        g.fillStyle(P.W1); g.fillRect(4,4,46,6); g.fillRect(4,13,46,6);
        g.fillStyle(P.W2); g.fillRect(14,33,8,29); g.fillRect(32,33,8,29);
      }, 54, 62);

      /* SOFA 112×68 */
      mkTex(this, 'sofa', g => {
        g.fillStyle(P.S1);
        g.fillRect(0,22,112,46); g.fillRect(0,4,112,22);
        g.fillRect(0,4,15,64); g.fillRect(97,4,15,64);
        g.fillStyle(P.S2);
        g.fillRect(17,24,38,38); g.fillRect(57,24,38,38);
        g.fillStyle(P.S3);
        g.fillRect(19,26,34,14); g.fillRect(59,26,34,14);
        g.fillStyle(P.S1);
        g.fillRect(17,24,2,38); g.fillRect(53,24,2,38);
        g.fillRect(57,24,2,38); g.fillRect(93,24,2,38);
        g.fillRect(17,24,38,2); g.fillRect(57,24,38,2);
        g.fillStyle(P.W2); g.fillRect(10,62,12,6); g.fillRect(90,62,12,6);
      }, 112, 68);

      /* WARDROBE 54×98 */
      mkTex(this, 'wardrobe', g => {
        g.fillStyle(P.R1); g.fillRect(0,0,54,98);
        g.fillStyle(P.R2);
        g.fillRect(0,0,54,4); g.fillRect(0,94,54,4);
        g.fillRect(0,0,4,98); g.fillRect(50,0,4,98);
        g.fillRect(23,4,8,90);
        g.fillStyle(P.R3);
        g.fillRect(6,6,15,86); g.fillRect(33,6,15,86);
        g.fillStyle(P.GL);
        g.fillRect(17,45,6,10); g.fillRect(31,45,6,10);
        g.fillStyle(P.R2);
        g.fillRect(4,92,10,6); g.fillRect(40,92,10,6);
      }, 54, 98);
    }

    /* PAPER BALL 38×38 */
    _txPaper() {
      mkTex(this, 'paper', g => {
        g.fillStyle(P.PP); g.fillCircle(19,19,18);
        g.fillStyle(P.PD); g.fillCircle(24,24,10);
        g.lineStyle(1.5, P.PD, 0.75);
        [[5,7,20,13],[10,3,24,16],[3,17,15,26],
         [18,22,30,14],[7,11,13,24],[22,5,32,20],
         [4,24,18,30]].forEach(([x1,y1,x2,y2]) =>
          g.strokeLineShape(new Phaser.Geom.Line(x1,y1,x2,y2)));
      }, 38, 38);
    }

    /* PAINTINGS — 7 custom designs, built with RenderTexture so we can use text */
    _txPaintings() {
      const F = '"Press Start 2P","Courier New",monospace';
      this._ptRTs = []; // keep RT refs alive — GC would destroy textures

      /* mkP: create a RenderTexture of size (w×h), run drawFn, save texture as key.
         Skips silently on scene restart when texture is already in cache.       */
      const mkP = (key, w, h, drawFn) => {
        if (this.textures.exists(key)) return;  // already cached
        const rt = this.add.renderTexture(0, 0, w, h).setVisible(false).setDepth(-999);
        drawFn(rt, w, h);
        rt.saveTexture(key);
        this._ptRTs.push(rt);
      };

      /* R: draw a Graphics primitive onto rt */
      const R = (rt, fn) => {
        const g = this.make.graphics({add:false});
        fn(g);
        rt.draw(g, 0, 0);
        g.destroy();
      };

      /*
       * T: draw text CENTERED at (cx, cy) within the RT.
       * rt.draw(obj, ox, oy) renders obj at (obj.x+ox, obj.y+oy).
       * Since we create text at (0,0), passing the desired top-left gives exact placement.
       */
      const T = (rt, str, cx, cy, style) => {
        const t = this.make.text({x:0, y:0, text:str,
          style:{fontFamily:F, ...style}, add:false});
        rt.draw(t, Math.floor(cx - t.width/2), Math.floor(cy - t.height/2));
        t.destroy();
      };

      /* Wooden frame helper */
      const frame = (rt, w, h) => R(rt, g => {
        g.fillStyle(0x5A3010); g.fillRect(0,0,w,h);
        g.fillStyle(0x7A4820); g.fillRect(1,1,w-2,h-2);
        g.fillStyle(0x9A6030); g.fillRect(2,2,w-4,h-4);
      });

      /* PNG_KEYS comment removed — all three now drawn via JS */

      /* ── pt7 : VS Code  (66×52) — текст на белом ──────────── */
      mkP('pt7', 66, 52, (rt, w, h) => {
        frame(rt, w, h);
        R(rt, g => { g.fillStyle(0xFFFFFF); g.fillRect(4,4,w-8,h-8); });
        T(rt, 'VS', w/2, h/2-10, {fontSize:'13px', color:'#007ACC'});
        T(rt, 'Code', w/2, h/2+8, {fontSize:'9px', color:'#0065A9'});
      });

      /* ── pt8 : Nuke  (52×52) ───────────────────────────────── */
      mkP('pt0', 66, 52, (rt, w, h) => {
        frame(rt, w, h);
        R(rt, g => { g.fillStyle(0x030508); g.fillRect(4,4,w-8,h-8); });

        // Dim "code" lines imitating a workflow editor background
        R(rt, g => {
          g.fillStyle(0x0C1E0C);
          [[5,9,20],[5,15,28],[5,21,16],[5,27,24],[5,33,18],[5,39,22],
           [33,9,18],[33,15,12],[33,21,22],[33,27,16],[33,33,20],[33,39,14]]
           .forEach(([x,y,l]) => g.fillRect(x,y,l,1));
        });

        // Glitch copies — magenta & cyan ghost, then solid white on top
        [{dx:-2, col:'#FF00CC', a:0.5}, {dx:2, col:'#00FFFF', a:0.5}].forEach(({dx,col,a}) => {
          const t = this.make.text({x:0,y:0,text:'ComfyUI',
            style:{fontFamily:F,fontSize:'7px',color:col},add:false});
          t.setAlpha(a);
          rt.draw(t, Math.floor((w-t.width)/2)+dx, Math.floor(h/2)-9);
          t.destroy();
        });
        T(rt, 'ComfyUI', w/2, h/2-6, {fontSize:'7px', color:'#FFFFFF'});
        T(rt, 'workflow', w/2, h/2+8, {fontSize:'5px', color:'#33FF88'});
      });

      /* ── pt1 : Blender 3D  (64×50) ─────────────────────────── */
      mkP('pt1', 64, 50, (rt, w, h) => {
        frame(rt, w, h);
        R(rt, g => { g.fillStyle(0xF4F4F4); g.fillRect(4,4,w-8,h-8); });
        // Orange horizontal bar
        T(rt, 'Blender', w/2, h/2-7, {fontSize:'8px', color:'#E86A00'});
        T(rt, '3D',      w/2, h/2+8, {fontSize:'10px', color:'#BF4400'});
      });

      /* ── pt2 : LM Studio  (64×50) ──────────────────────────── */
      mkP('pt2', 64, 50, (rt, w, h) => {
        frame(rt, w, h);
        R(rt, g => {
          // Deep blue-purple gradient (pixel approximation — 3 bands)
          g.fillStyle(0x0A0830); g.fillRect(4,4,w-8,Math.floor((h-8)/3));
          g.fillStyle(0x130D3E); g.fillRect(4,4+Math.floor((h-8)/3),w-8,Math.floor((h-8)/3));
          g.fillStyle(0x1C1450); g.fillRect(4,4+Math.floor(2*(h-8)/3),w-8,h-8-Math.floor(2*(h-8)/3));
          // Stars
          g.fillStyle(0xFFFFFF);
          [[8,7],[14,12],[23,8],[32,11],[41,7],[50,13],[10,19],[37,18],[55,8]].forEach(([x,y])=>g.fillRect(x,y,1,1));
          g.fillStyle(0xFFFFAA);
          [[18,16],[28,9],[46,17]].forEach(([x,y])=>g.fillRect(x,y,2,2));
        });
        T(rt, 'LM',     w/2, h/2-8, {fontSize:'11px', color:'#D8D8FF'});
        T(rt, 'Studio', w/2, h/2+8, {fontSize:'6px',  color:'#8888BB'});
      });

      /* ── pt3 : Ps — Photoshop icon  (52×52) ────────────────── */
      mkP('pt3', 52, 52, (rt, w, h) => {
        // Dark navy body (Photoshop brand)
        R(rt, g => {
          g.fillStyle(0x001B44); g.fillRect(0,0,w,h);
          // Dark frame edge
          g.fillStyle(0x00122E); g.fillRect(0,0,w,2); g.fillRect(0,h-2,w,2);
          g.fillRect(0,0,2,h); g.fillRect(w-2,0,2,h);
          // Inner subtle border
          g.lineStyle(1,0x003380,0.6); g.strokeRect(3,3,w-6,h-6);
        });
        T(rt, 'Ps', w/2, h/2-1, {fontSize:'18px', color:'#31A8FF'});
      });

      /* ── pt4 : Ai — Illustrator icon  (52×52) ──────────────── */
      mkP('pt4', 52, 52, (rt, w, h) => {
        R(rt, g => {
          g.fillStyle(0x2C0B00); g.fillRect(0,0,w,h);
          g.fillStyle(0x1E0700); g.fillRect(0,0,w,2); g.fillRect(0,h-2,w,2);
          g.fillRect(0,0,2,h); g.fillRect(w-2,0,2,h);
          g.lineStyle(1,0x7A2A00,0.5); g.strokeRect(3,3,w-6,h-6);
        });
        T(rt, 'Ai', w/2, h/2-1, {fontSize:'18px', color:'#FF9A00'});
      });

      /* ── pt5 : Ae + Pr — horizontal  (88×52) ───────────────── */
      mkP('pt5', 88, 52, (rt, w, h) => {
        frame(rt, w, h);
        R(rt, g => { g.fillStyle(0x0D0020); g.fillRect(4,4,w-8,h-8); });

        const bx = 4, by = 4, bh = h-8;
        const half = Math.floor((w-8) / 2);

        // After Effects box (left) — deep purple
        R(rt, g => {
          g.fillStyle(0x12003A); g.fillRect(bx, by, half-1, bh);
          g.lineStyle(1, 0x6644CC, 0.7); g.strokeRect(bx, by, half-1, bh);
        });
        T(rt, 'Ae', bx + Math.floor(half/2), h/2-1, {fontSize:'14px', color:'#9988FF'});

        // Plus divider
        T(rt, '+', w/2, h/2-3, {fontSize:'8px', color:'#554466'});

        // Premiere Pro box (right) — dark violet-pink
        R(rt, g => {
          g.fillStyle(0x22003A); g.fillRect(bx+half+1, by, half-1, bh);
          g.lineStyle(1, 0xAA44AA, 0.7); g.strokeRect(bx+half+1, by, half-1, bh);
        });
        T(rt, 'Pr', bx+half+1 + Math.floor(half/2), h/2-1, {fontSize:'14px', color:'#CC66CC'});
      });

      /* ── pt8 : Nuke  (52×52) ───────────────────────────────── */
      mkP('pt8', 52, 52, (rt, w, h) => {
        // Black background
        R(rt, g => { g.fillStyle(0x111111); g.fillRect(0,0,w,h); });
        // Outer golden ring
        R(rt, g => {
          g.fillStyle(0xF0A800);
          g.fillCircle(26,26,23);
          g.fillStyle(0x111111);
          g.fillCircle(26,26,18);
        });
        // Three blades of Nuke's radiation-style icon in golden yellow
        // The Nuke logo has 3 asymmetric wedge-blades around a small centre circle
        // Blade 1: top-right
        R(rt, g => {
          g.fillStyle(0xF0A800);
          // Top blade (pointing up-right)
          g.fillTriangle(26,26, 34,10, 44,20);
          // Right blade (pointing bottom-right)
          g.fillTriangle(26,26, 44,32, 30,44);
          // Left blade (pointing left)
          g.fillTriangle(26,26, 10,38, 10,18);
          // Centre black hole
          g.fillStyle(0x111111);
          g.fillCircle(26,26,6);
          // Small golden centre dot (Nuke's distinctive pupil)
          g.fillStyle(0xF0A800);
          g.fillEllipse(27,25,5,4);
        });
        // Pixel label
        T(rt, 'nuke', w/2, h-9, {fontSize:'5px', color:'#F0A800'});
      });

      /* ── pt9 : Pinokio  (52×52) — drawn in JS ──────────────── */
      mkP('pt9', 52, 52, (rt, w, h) => {
        frame(rt, w, h);
        // White background inside frame
        R(rt, g => { g.fillStyle(0xFFFFFF); g.fillRect(4,4,w-8,h-8); });
        // User-supplied Pinokio logo
        R(rt, g => {
          g.fillStyle(0x000000); g.fillCircle(26,26,22);
          g.fillStyle(0xFFFFFF); g.fillCircle(26,26,19);
        });
        R(rt, g => {
          g.fillStyle(0x000000);
          g.fillRect(24,18,4,4);
          g.fillRect(36,18,4,4);
        });
        R(rt, g => {
          g.fillStyle(0x000000); g.fillRect(38,26,12,6);
          g.fillStyle(0xFFFFFF); g.fillRect(38,27,10,4);
          g.fillStyle(0x000000); g.fillRect(48,27,2,4);
        });
        R(rt, g => { g.fillStyle(0x000000); g.fillRect(26,36,12,3); });
        //T(rt, 'pinokio', w/2, h-5, {fontSize:'5px', color:'#000000'});
      });

      /* ── pt10 : Houdini  (52×52) — текст на оранжевом ─────── */
      mkP('pt10', 52, 52, (rt, w, h) => {
        frame(rt, w, h);
        R(rt, g => { g.fillStyle(0xFF8C00); g.fillRect(4,4,w-8,h-8); });
        T(rt, 'Houdini', w/2, h/2, {fontSize:'6px', color:'#000000'});
      });

      /* ── pt6 : Pixel nature — forest & snow mountains  (46×66) */
      mkP('pt6', 46, 66, (rt, w, h) => {
        frame(rt, w, h);
        const ix=4, iy=4, iw=w-8, ih=h-8;
        const skyH = Math.floor(ih * 0.45);
        const mBase = iy + skyH;
        R(rt, g => {
          g.fillStyle(0x60A4DC); g.fillRect(ix,iy,iw,Math.ceil(skyH*0.4));
          g.fillStyle(0x5098D0); g.fillRect(ix,iy+Math.ceil(skyH*0.4),iw,Math.floor(skyH*0.35));
          g.fillStyle(0x4488BE); g.fillRect(ix,iy+Math.ceil(skyH*0.75),iw,skyH-Math.ceil(skyH*0.75));
        });
        R(rt, g => {
          g.fillStyle(0xEEF3FF);
          [[6,7,10,3],[8,8,6,2],[20,6,8,3],[22,7,4,2],[30,9,11,3],[32,10,6,2]].forEach(([x,y,cw,ch])=>g.fillRect(x,y,cw,ch));
        });
        R(rt, g => {
          for (let r=0; r<=18; r++) {
            g.fillStyle(r<=7?0xEEF2FF:0x7A8FA8);
            g.fillRect(ix+6-r, mBase-18+r, r*2+1, 1);
          }
        });
        R(rt, g => {
          for (let r=0; r<=12; r++) {
            g.fillStyle(r<=4?0xEEF2FF:0x8A9FB8);
            g.fillRect(ix+24-r, mBase-12+r, r*2+1, 1);
          }
        });
        const groundY = mBase + 3, groundH = iy + ih - groundY;
        R(rt, g => {
          g.fillStyle(0x3A7028); g.fillRect(ix, groundY, iw, groundH);
          g.fillStyle(0x4A8830); g.fillRect(ix, groundY, iw, 2);
        });
        R(rt, g => {
          const cols=[0x1E4E18,0x286024,0x224C1C,0x306828,0x1A4414];
          [[6,groundY,7,15],[13,groundY+2,5,11],[20,groundY-1,8,17],[28,groundY+1,6,13],[35,groundY,6,14]].forEach(([tx,ty,tw,th],ci)=>{
            g.fillStyle(cols[ci]);
            for(let r=0;r<th;r++){const rw=Math.max(1,Math.round(tw*(th-r)/th));g.fillRect(tx+Math.floor((tw-rw)/2),ty-r,rw,1);}
            g.fillStyle(0x5A3010); g.fillRect(tx+Math.floor(tw/2)-1,ty,2,3);
          });
        });
      });
    }  /* end _txPaintings */
    _txBowl() {
      mkTex(this, 'bowl', g => {
        g.fillStyle(0xFFFF88, 0.18); g.fillEllipse(43,38,80,55);
        g.fillStyle(0x888888); g.fillEllipse(43,54,66,15);
        g.fillStyle(0xCCCCCC); g.fillEllipse(43,48,66,20);
        g.fillStyle(0xBBBBBB); g.fillEllipse(43,46,62,14);
        g.fillStyle(0xE8A040); g.fillEllipse(43,43,54,11);
        g.fillStyle(0xCC8030);
        [26,34,43,52,60].forEach(x => g.fillCircle(x,42,4));
      }, 86, 58);
    }

    /* CHRISTMAS OBSTACLES — gift box (54×62) + xmas tree (54×98) */
    _txXmas() {
      /* Gift box — 54×62, same hitbox tier as CHAIR */
      mkTex(this, 'gift', g => {
        g.fillStyle(0x1A1A1A); g.fillRect(0,16,54,46);
        g.fillStyle(0xE8ECF0); g.fillRect(2,18,50,42);
        g.fillStyle(0xB8CEDE); g.fillRect(2,18,4,42); g.fillRect(48,18,4,42); g.fillRect(2,56,50,4);
        g.fillStyle(0xCC0000); g.fillRect(22,18,10,42);
        g.fillStyle(0xEE1111); g.fillRect(24,18,6,42);
        g.fillStyle(0xCC0000); g.fillRect(2,30,50,10);
        g.fillStyle(0xEE1111); g.fillRect(2,32,50,6);
        // Left bow lobe
        g.fillStyle(0x1A1A1A); g.fillRect(4,2,20,16);
        g.fillStyle(0xCC0000); g.fillRect(5,3,18,14);
        g.fillStyle(0xEE2222); g.fillRect(6,4,8,6); g.fillRect(14,4,8,6);
        g.fillStyle(0xFFAAAA); g.fillRect(7,4,3,3); g.fillRect(15,4,3,3);
        // Right bow lobe
        g.fillStyle(0x1A1A1A); g.fillRect(30,2,20,16);
        g.fillStyle(0xCC0000); g.fillRect(31,3,18,14);
        g.fillStyle(0xEE2222); g.fillRect(32,4,8,6); g.fillRect(40,4,8,6);
        g.fillStyle(0xFFAAAA); g.fillRect(33,4,3,3); g.fillRect(41,4,3,3);
        // Bow knot
        g.fillStyle(0xAA0000); g.fillRect(20,0,14,18);
        g.fillStyle(0xDD1111); g.fillRect(22,2,10,14);
        g.fillStyle(0xFF4444); g.fillRect(24,3,6,5);
        g.fillStyle(0xFFAAAA); g.fillRect(25,3,3,3);
      }, 54, 62);

      /* Christmas tree — 54×98, same hitbox tier as WARDROBE */
      mkTex(this, 'xtree', g => {
        g.fillStyle(0x5A3010); g.fillRect(20,84,14,14);
        g.fillStyle(0x7A4820); g.fillRect(22,84,10,14);
        [[58,54,28],[34,42,28],[12,30,28]].forEach(([y,w,h],ti) => {
          const xl=(54-w)/2;
          g.fillStyle(0x0E2A0E); g.fillTriangle(27,y-2,xl-2,y+h+2,xl+w+2,y+h+2);
          g.fillStyle(ti===0?0x1A5C1A:ti===1?0x1E6E1E:0x228822); g.fillTriangle(27,y,xl,y+h,xl+w,y+h);
          g.fillStyle(ti===0?0x226622:ti===1?0x287228:0x2A8C2A); g.fillTriangle(27,y,23,y+10,31,y+10);
        });
        [[14,74],[22,70],[32,72],[40,68],[10,64],[18,52],[28,50],[36,54],[42,48],[12,44],[20,30],[28,28],[34,32],[22,22],[30,20],[26,14]]
          .forEach(([x,y],i)=>{ g.fillStyle(i%2===0?0xFF2222:0xFFDD00); g.fillRect(x-1,y-1,4,4); g.fillStyle(i%2===0?0xFF8888:0xFFFF88); g.fillRect(x,y,2,2); });
        g.fillStyle(0xFFEE00); g.fillRect(24,6,6,6); g.fillRect(22,8,10,2); g.fillRect(27,4,2,10);
        g.fillStyle(0xFFFF88); g.fillRect(25,7,4,4);
      }, 54, 98);
    }

    /* UI BUTTONS */
    _txUI() {
      /* Restart 190×58 */
      mkTex(this, 'btn_r', g => {
        g.fillStyle(0x1E8449); g.fillRoundedRect(0,0,190,58,8);
        g.fillStyle(0x27AE60); g.fillRoundedRect(2,2,186,52,6);
        g.fillStyle(0x2ECC71); g.fillRoundedRect(3,3,184,48,5);
        g.lineStyle(5,0xFFFFFF); g.strokeCircle(36,29,13);
        g.fillStyle(0xFFFFFF); g.fillTriangle(44,19,56,17,54,28);
      }, 190, 58);

      /* Close 58×58 */
      mkTex(this, 'btn_x', g => {
        g.fillStyle(0x922B21); g.fillRoundedRect(0,0,58,58,8);
        g.fillStyle(0xC0392B); g.fillRoundedRect(2,2,54,54,6);
        g.fillStyle(0xE74C3C); g.fillRoundedRect(3,3,52,52,5);
        g.lineStyle(5,0xFFFFFF);
        g.strokeLineShape(new Phaser.Geom.Line(15,15,43,43));
        g.strokeLineShape(new Phaser.Geom.Line(43,15,15,43));
      }, 58, 58);
    }

    /* ENVIRONMENT TEXTURES */
    _txEnv() {
      /* Floor plank 48×18 */
      mkTex(this, 'plank', g => {
        g.fillStyle(P.FB); g.fillRect(0,0,48,18);
        g.fillStyle(P.FD); g.fillRect(0,0,48,1); g.fillRect(0,17,48,1);
        g.fillStyle(0xAA8B60); g.fillRect(1,1,46,15);
        g.fillStyle(P.FD,0.5);
        g.fillRect(8,3,1,12); g.fillRect(24,4,1,9); g.fillRect(38,2,1,13);
      }, 48, 18);

      /* Wall section 48×40 */
      mkTex(this, 'wall', g => {
        g.fillStyle(P.WB); g.fillRect(0,0,48,40);
        g.fillStyle(P.WD,0.25);
        g.fillRect(0,20,48,1); g.fillRect(24,0,1,40);
      }, 48, 40);

      /* Baseboard 48×14 */
      mkTex(this, 'base', g => {
        g.fillStyle(P.BS); g.fillRect(0,0,48,14);
        g.fillStyle(P.BH); g.fillRect(0,0,48,3);
        g.fillStyle(0xD0C4AE); g.fillRect(0,11,48,3);
      }, 48, 14);

      /* 1×1 white pixel */
      mkTex(this, 'px', g => { g.fillStyle(0xFFFFFF); g.fillRect(0,0,1,1); }, 1, 1);
    }

    /* ── Background ─────────────────────────────────────────── */
    _buildBg() {
      /* Sky */
      this.skyRect = this.add.rectangle(0,0,GW,SKY_BOTTOM,P.SK).setOrigin(0,0).setDepth(0);

      /* Clouds */
      this.clouds = Array.from({length:5}, () => {
        const t = Phaser.Math.Between(0,2);
        const c = this.add.image(Phaser.Math.Between(-80,GW+80), Phaser.Math.Between(8,SKY_BOTTOM-40), `cl${t}`)
          .setAlpha(0.88).setDepth(1);
        c.spd = Phaser.Math.FloatBetween(16,36);
        return c;
      });

      /* Sun */
      this.sunSp = this.add.image(52,58,'sun').setDepth(2).setScale(0.88);

      /* Wall tile */
      this.wallTile = this.add.tileSprite(0,SKY_BOTTOM,GW,GROUND_TOP-SKY_BOTTOM,'wall')
        .setOrigin(0,0).setDepth(3);

      /* Paintings — 6 plain Images, all baked textures, no PNG loading */
      const PT_COUNT = 11;
      const initIdxs = Phaser.Utils.Array.Shuffle([...Array(PT_COUNT).keys()]);
      this.paintings = Array.from({length: 6}, (_, i) => {
        const x   = 90 + i * 128 + Phaser.Math.Between(-8, 8);
        const y   = SKY_BOTTOM + 48 + Phaser.Math.Between(-4, 10);
        const idx = initIdxs[i % PT_COUNT];
        const p   = this.add.image(x, y, `pt${idx}`).setDepth(4);
        p.ptKey   = idx;
        return p;
      });
      this._PT_COUNT = PT_COUNT;

      /* Baseboard */
      this.baseTile = this.add.tileSprite(0,GROUND_TOP-14,GW,14,'base')
        .setOrigin(0,0).setDepth(5);

      /* Floor planks */
      this.floorTile = this.add.tileSprite(0,GROUND_TOP,GW,GH-GROUND_TOP,'plank')
        .setOrigin(0,0).setDepth(5);

      /* Day/Night overlays */
      this.dnOvl    = this.add.rectangle(GW/2,GH/2,GW,GH,0x000000,0).setDepth(20);
      this.nightBlue= this.add.rectangle(GW/2,GH/2,GW,GH,0x08162E,0).setDepth(21);
    }

    /* ── Cat (arcade physics) ───────────────────────────────── */
    _buildCat() {
      /*
       * Ground — a wide static-group tile so the cat can never fall through.
       * Center at (GW/2, GROUND_TOP+20), size (GW*4, 40) → top edge = GROUND_TOP.
       * refreshBody() is REQUIRED after setDisplaySize on a static body.
       */
      this.gndGroup = this.physics.add.staticGroup();
      const gBlock  = this.gndGroup.create(GW / 2, GROUND_TOP + 20, 'px');
      gBlock.setDisplaySize(GW * 4, 40).setVisible(false);
      gBlock.refreshBody();

      /*
       * Cat Y calculation:
       *   texture 56×52, origin (0.5,0.5) → texture centre = (cat.x, cat.y)
       *   setSize(30,38) setOffset(13,10):
       *     body bottom in world = cat.y − 26 + 10 + 38 = cat.y + 22
       *   For body bottom == GROUND_TOP → cat.y = GROUND_TOP − 22
       */
      this.cat = this.physics.add
        .sprite(CAT_X, GROUND_TOP - 22, 'cr0')
        .setDepth(10)
        .setCollideWorldBounds(false);
      this.cat.body.setSize(30, 38).setOffset(13, 10);

      this.physics.add.collider(this.cat, this.gndGroup);
      this.cat.play('run');
    }

    /* ── UI ─────────────────────────────────────────────────── */
    _buildUI() {
      const F = '"Press Start 2P","Courier New",monospace';

      /* Distance meter */
      this.mTxt = this.add.text(GW-14,14,'0 м',{
        fontFamily:F, fontSize:'13px', color:'#ffffff',
        stroke:'#003366', strokeThickness:3,
      }).setOrigin(1,0).setDepth(22);

      /* Hint (fades after 3 s) */
      this.hint = this.add.text(GW/2,GH/2+50, _txt[_lang].hint,{
        fontFamily:F, fontSize:'9px', color:'#ffffffaa',
        stroke:'#00000088', strokeThickness:2,
      }).setOrigin(0.5).setDepth(22);
      this.tweens.add({targets:this.hint, alpha:0, delay:2800, duration:1400});

      /* DAK text on wall */
      this.dakTxt = this.add.text(200,SKY_BOTTOM+50,'DAK',{
        fontFamily:F, fontSize:'22px', color:'#CC9944',
        stroke:'#886622', strokeThickness:2,
      }).setDepth(6).setAlpha(0);

      /* Modal overlay */
      this.uiOvl = this.add.rectangle(GW/2,GH/2,GW,GH,0x000000,0)
        .setDepth(30).setVisible(false);

      /* Big modal text */
      this.bigTxt = this.add.text(GW/2,GH/2-54,'',{
        fontFamily:F, fontSize:'24px', color:'#FF4444',
        stroke:'#000000', strokeThickness:5, align:'center',
      }).setOrigin(0.5).setDepth(31).setVisible(false);

      /* Sub text */
      this.subTxt = this.add.text(GW/2,GH/2-18,'',{
        fontFamily:F, fontSize:'10px', color:'#CCCCCC',
        stroke:'#000000', strokeThickness:3,
      }).setOrigin(0.5).setDepth(31).setVisible(false);

      /* Restart button */
      this.btnR = this.add.image(GW/2-40,GH/2+30,'btn_r')
        .setDepth(31).setVisible(false)
        .setInteractive({useHandCursor:true})
        .on('pointerdown', ()=>this.scene.restart())
        .on('pointerover', ()=>this.btnR.setTint(0xDDFFDD))
        .on('pointerout',  ()=>this.btnR.clearTint());

      this.btnRtxt = this.add.text(GW/2-40+28,GH/2+30, _txt[_lang].restart,{
        fontFamily:F, fontSize:'15px', color:'#ffffff',
      }).setOrigin(0.5).setDepth(32).setVisible(false);

      /* Close button */
      this.btnX = this.add.image(GW/2+130,GH/2+30,'btn_x')
        .setDepth(31).setVisible(false)
        .setInteractive({useHandCursor:true})
        .on('pointerdown', ()=>CatGame.hide())
        .on('pointerover', ()=>this.btnX.setTint(0xFFDDDD))
        .on('pointerout',  ()=>this.btnX.clearTint());

      /* Food bowl (hidden until win) */
      this.bowl = this.add.image(GW+80, GROUND_TOP-29,'bowl').setDepth(9).setVisible(false);
    }

    /* ── Input ──────────────────────────────────────────────── */
    _buildInput() {
      this.keys = this.input.keyboard.addKeys({
        space: Phaser.Input.Keyboard.KeyCodes.SPACE,
        up:    Phaser.Input.Keyboard.KeyCodes.UP,
        w:     Phaser.Input.Keyboard.KeyCodes.W,
      });
      this.input.on('pointerdown', () => { if (!this.over && !this.won) this._jump(); });
    }

    _jump() {
      if (this.cat.body.blocked.down) {
        this.cat.setVelocityY(JUMP_VEL);
      }
    }

    /* ══════════════════════════════════════════════════════════
       UPDATE LOOP
    ══════════════════════════════════════════════════════════ */
    update(_, delta) {
      if (this.over || this.won) return;

      const dt = delta / 1000;

      /* Keyboard jump */
      if (Phaser.Input.Keyboard.JustDown(this.keys.space) ||
          Phaser.Input.Keyboard.JustDown(this.keys.up) ||
          Phaser.Input.Keyboard.JustDown(this.keys.w)) {
        this._jump();
      }

      /* Distance & speed */
      this.dist += this.spd * dt / DIST_K;
      if (this.dist >= MAX_DIST) { this.dist = MAX_DIST; this._win(); return; }
      this.spd = Math.min(BASE_SPD + this.dist * SPD_K, MAX_SPD);

      /* Cat animation */
      if (this.cat.body.blocked.down) {
        if (!this.cat.anims.isPlaying || this.cat.anims.currentAnim?.key !== 'run')
          this.cat.play('run', true);
      } else {
        this.cat.anims.stop(); this.cat.setTexture('cj');
      }

      /* Spawn timer */
      this.spawnT += delta;
      if (this.spawnT >= this.nextSp) {
        this.spawnT = 0;
        this.nextSp = this._nextInterval();
        this._spawn();
      }

      /* Move obstacles */
      this._moveObjs(dt);

      /* Collision */
      this._checkColl();

      /* Background */
      this._scrollBg(dt);
      this._dayNight();

      /* DAK text */
      this.dakT += delta;
      if (this.dakT >= this.dakD) {
        this.dakT = 0;
        this.dakD = Phaser.Math.Between(5000,16000);
        this._showDak();
      }

      /* HUD */
      this.mTxt.setText(Math.floor(this.dist) + ' м');
    }

    /* ── Spawning ────────────────────────────────────────────── */
    _nextInterval() {
      const top = Math.max(700, 2500 - this.dist * 0.15);
      return Phaser.Math.Between(top * 0.55, top);
    }

    /* Returns the world-X of the right edge of the furthest-right object.
       Used to enforce a minimum gap before the next spawn. */
    _rightmostObjEdge() {
      if (this.objs.length === 0) return -Infinity;
      return Math.max(...this.objs.map(o => o.spr.x + o.hw * 2));
    }

    _spawn() {
      if (Math.random() < 0.33) this._spawnPaper();
      else                       this._spawnFurniture();
    }

    /* ── Christmas date check ───────────────────────────────── */
    _isXmas() {
      const now = new Date();
      const m = now.getMonth() + 1; // 1-12
      const d = now.getDate();
      return (m === 12 && d >= 25) || (m === 1 && d <= 15);
    }

    _spawnFurniture() {
      const baseDefs = [
        {key:'table',   hw:41, hh:27},
        {key:'chair',   hw:27, hh:31},
        {key:'sofa',    hw:56, hh:34},
        {key:'wardrobe',hw:27, hh:49},
      ];
      /* In Christmas season, gift boxes and fir trees join the obstacle pool */
      const defs = this._isXmas()
        ? [...baseDefs,
            {key:'gift',  hw:27, hh:31},   // same tier as chair
            {key:'xtree', hw:27, hh:49},   // same tier as wardrobe
            {key:'gift',  hw:27, hh:31},   // double weight so gifts appear more often
            {key:'xtree', hw:27, hh:49},
          ]
        : baseDefs;
      const d       = defs[Phaser.Math.Between(0, defs.length - 1)];
      const spawnX  = GW + d.hw + 20;
      const fullW   = d.hw * 2;
      const minGap  = fullW * 3;          // ← minimum gap = 3 × item width

      /* Skip spawn if there isn't enough room yet */
      if (this._rightmostObjEdge() > spawnX - minGap) return;

      const y = GROUND_TOP - d.hh;
      this.objs.push({
        spr: this.add.image(spawnX, y, d.key).setDepth(8),
        hw: d.hw * 0.8,
        hh: d.hh * 0.85,
      });
    }

    _spawnPaper() {
      const pHw    = 19;                  // half-width of paper ball (38px diameter)
      const spawnX = GW + pHw + 20;
      const minGap = pHw * 2 * 3;        // ← 3 × diameter

      if (this._rightmostObjEdge() > spawnX - minGap) return;

      /* 1–3 balls, each at least 3 diameters apart from the previous */
      const count   = Math.random() < 0.38 ? Phaser.Math.Between(2, 3) : 1;
      const spacing = Phaser.Math.Between(pHw * 2 * 4, pHw * 2 * 6); // 4–6× diameter gap
      for (let i = 0; i < count; i++) {
        const x = spawnX + i * spacing;
        const y = Phaser.Math.Between(SKY_BOTTOM + 16, GROUND_TOP - 52);
        this.objs.push({
          spr: this.add.image(x, y, 'paper').setDepth(9),
          hw: pHw, hh: pHw, paper: true,
        });
      }
    }

    _moveObjs(dt) {
      const dead = [];
      this.objs.forEach((o,i) => {
        const spd = o.paper ? this.spd * 1.35 : this.spd;
        o.spr.x -= spd * dt;
        if (o.paper) o.spr.angle += 4;
        if (o.spr.x < -160) dead.push(i);
      });
      dead.reverse().forEach(i => { this.objs[i].spr.destroy(); this.objs.splice(i,1); });
    }

    /* ── Collision (AABB) ────────────────────────────────────── */
    _checkColl() {
      if (this.over) return;
      const cx = this.cat.x, cy = this.cat.y;
      const chw = 14, chh = 18;
      for (const o of this.objs) {
        if (Math.abs(cx - o.spr.x) < chw + o.hw &&
            Math.abs(cy - o.spr.y) < chh + o.hh) {
          this._gameOver(); return;
        }
      }
    }

    /* ── Background scrolling ────────────────────────────────── */
    _scrollBg(dt) {
      this.floorTile.tilePositionX += this.spd * dt;
      this.baseTile.tilePositionX  += this.spd * dt;
      this.wallTile.tilePositionX  += this.spd * 0.3 * dt;

      /* Paintings parallax — simple plain Images, no PNG overlay */
      const ptCount = this._PT_COUNT;
      this.paintings.forEach((p, i) => {
        p.x -= this.spd * 0.42 * dt;
        if (p.x < -80) {
          p.x = GW + 60;
          p.y = SKY_BOTTOM + 48 + Phaser.Math.Between(-4, 10);
          const usedKeys = new Set(this.paintings.filter((_, j) => j !== i).map(q => q.ptKey));
          const pool     = Phaser.Utils.Array.Shuffle([...Array(ptCount).keys()]);
          const newIdx   = pool.find(k => !usedKeys.has(k)) ?? pool[0];
          p.ptKey = newIdx;
          p.setTexture(`pt${newIdx}`);
        }
      });

      /* Sun arc across sky */
      if (this.dist < MAX_DIST * 0.86) {
        const t = this.dist / (MAX_DIST * 0.86);
        this.sunSp.x = 52  + t * (GW - 100);
        this.sunSp.y = 58  - Math.sin(t * Math.PI) * 24;
      }
      this.sunSp.angle += 0.14;

      /* Clouds drift leftward */
      this.clouds.forEach(c => {
        c.x -= c.spd * dt;
        if (c.x < -110) {
          c.x = GW + 90;
          c.y = Phaser.Math.Between(8, SKY_BOTTOM-38);
          c.setTexture(`cl${Phaser.Math.Between(0,2)}`);
        }
      });

      /* Moon tracks sun after 8500 m */
      if (this.moonSp) {
        this.moonSp.x = this.sunSp.x;
        this.moonSp.y = this.sunSp.y;
      }
    }

    /* ── Day / Night cycle ───────────────────────────────────── */
    _dayNight() {
      const d = this.dist;
      let alpha = 0;
      if      (d < 1000) alpha = lerp(0.4, 0,    d / 1000);
      else if (d > 7000) alpha = lerp(0,   0.60, (d-7000)/3000);
      this.dnOvl.setAlpha(alpha);

      /* Sky colour */
      if (d < 800) {
        this.skyRect.setFillStyle(hexLerp(0xFFAA44, P.SK, d/800));
      } else if (d > 7000) {
        this.skyRect.setFillStyle(hexLerp(P.SK, 0x080D1A, (d-7000)/3000));
      } else {
        this.skyRect.setFillStyle(P.SK);
      }

      /* Moon swap at 8500 m */
      if (d >= 8500) {
        this.sunSp.setVisible(false);
        if (!this.moonSp) {
          this.moonSp = this.add.image(this.sunSp.x, this.sunSp.y,'moon').setDepth(2);
        }
        this.moonSp.setVisible(true);
        this.nightBlue.setAlpha(lerp(0, 0.18, (d-8500)/1500));
        this.wallTile.setTint(0xD8CEA8);
      } else {
        this.sunSp.setVisible(true);
        if (this.moonSp) this.moonSp.setVisible(false);
        this.nightBlue.setAlpha(0);
        this.wallTile.setTint(0xFFFFFF);
      }
    }

    /* ── DAK text ─────────────────────────────────────────────── */
    _showDak() {
      const x = Phaser.Math.Between(90, GW-90);
      const y = Phaser.Math.Between(SKY_BOTTOM+16, GROUND_TOP-28);
      this.dakTxt.setPosition(x,y).setAlpha(0);
      this.tweens.add({
        targets:  this.dakTxt,
        alpha:    { from:0, to:0.72 },
        duration: 500,
        hold:     2400,
        yoyo:     true,
      });
    }

    /* ── Retro death sound (Web Audio API — no files needed) ──── */
    _playDeathSound() {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        /* Classic 4-note descending "game over" jingle in square-wave */
        [
          { freq: 494, t: 0.00, dur: 0.10 },
          { freq: 392, t: 0.12, dur: 0.10 },
          { freq: 330, t: 0.24, dur: 0.10 },
          { freq: 247, t: 0.36, dur: 0.28 },
        ].forEach(({ freq, t, dur }) => {
          const osc  = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'square';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + t);
          gain.gain.setValueAtTime(0.16, ctx.currentTime + t);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + dur);
          osc.start(ctx.currentTime + t);
          osc.stop(ctx.currentTime + t + dur + 0.02);
        });
        setTimeout(() => { try { ctx.close(); } catch (e) {} }, 900);
      } catch (e) {}
    }

    /* ── Game Over ───────────────────────────────────────────── */
    _gameOver() {
      if (this.over) return;
      this.over = true;
      this.cat.anims.stop();
      this.cat.setTexture('cj');
      this.cat.setVelocity(0, -180);

      this.cameras.main.shake(300, 0.013);
      this.cameras.main.flash(160, 255, 60, 60, false);
      this._playDeathSound();

      this.time.delayedCall(360, () => {
        this.uiOvl.setVisible(true).setAlpha(0.68);
        this.bigTxt.setText(_txt[_lang].gameover).setColor('#FF4444').setVisible(true);
        this.subTxt.setText(_txt[_lang].hit).setVisible(true);
        this.btnR.setVisible(true);
        this.btnRtxt.setText(_txt[_lang].restart).setVisible(true);
        this.btnX.setVisible(true);
      });
    }

    /* ── Win ─────────────────────────────────────────────────── */
    _win() {
      if (this.won) return;
      this.won = true;
      this.spd = 0;

      /* Clear all obstacles */
      this.objs.forEach(o => o.spr.destroy());
      this.objs = [];

      /* Show bowl, light it up */
      this.bowl.setVisible(true).setX(GW - 90);
      this.tweens.add({
        targets: this.bowl, alpha:{from:0.6,to:1},
        duration:500, yoyo:true, repeat:-1,
      });

      /* Glowing floor spotlight */
      const glow = this.add.rectangle(GW-90, GROUND_TOP-10, 120, GH-GROUND_TOP+10+20, 0xCCEEFF, 0.12)
        .setDepth(7);
      this.tweens.add({ targets:glow, alpha:{from:0.08,to:0.22}, duration:700, yoyo:true, repeat:-1 });

      /* Moon mandatory */
      if (!this.moonSp) {
        this.moonSp = this.add.image(this.sunSp.x, this.sunSp.y,'moon').setDepth(2);
      }
      this.sunSp.setVisible(false);
      this.moonSp.setVisible(true);
      this.nightBlue.setAlpha(0.18);
      this.dnOvl.setAlpha(0.55);
      this.skyRect.setFillStyle(0x080D1A);

      this.time.delayedCall(1100, () => {
        this.uiOvl.setVisible(true).setAlpha(0.72);
        this.bigTxt.setText(_txt[_lang].win).setColor('#FFD700').setVisible(true);
        this.subTxt.setText(_txt[_lang].winSub).setVisible(true);
        this.btnR.setVisible(true);
        this.btnRtxt.setText(_txt[_lang].restart).setVisible(true);
        this.btnX.setVisible(true);
        this.tweens.add({
          targets: this.bigTxt,
          scaleX:{from:1,to:1.06}, scaleY:{from:1,to:1.06},
          duration:750, yoyo:true, repeat:-1, ease:'Sine.easeInOut',
        });
      });
    }
  }

  /* ── i18n ──────────────────────────────────────────────────── */
  let _lang = 'ru';
  const _txt = {
    ru: {
      gameover: 'ИГРА ОКОНЧЕНА',
      hit:      'Кот налетел на препятствие!',
      win:      'ВЫ ПОБЕДИЛИ! 🐱',
      winSub:   'Котик добрался до еды!',
      restart:  'Заново',
      hint:     'ПРОБЕЛ / ТАП — ПРЫЖОК',
    },
    en: {
      gameover: 'GAME OVER',
      hit:      'The cat hit an obstacle!',
      win:      'YOU WIN! 🐱',
      winSub:   'The cat reached the food!',
      restart:  'Restart',
      hint:     'SPACE / TAP — JUMP',
    },
  };

  /* ── Phaser Config ─────────────────────────────────────────── */
  const cfg = {
    type: Phaser.AUTO,
    width: GW, height: GH,
    parent: 'cat-game',
    backgroundColor: '#87C5E8',
    physics: {
      default: 'arcade',
      arcade: { gravity:{ y:GRAVITY }, debug:false },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [GameScene],
  };

  /* ── Public API ────────────────────────────────────────────── */
  let _game = null;
  let _savedBodyStyles = null;

  function saveBodyStyles() {
    const s = document.body.style;
    _savedBodyStyles = {
      overflow:  s.overflow,
      height:    s.height,
      minHeight: s.minHeight,
      margin:    s.margin,
    };
  }

  function restoreBodyStyles() {
    if (!_savedBodyStyles) return;
    const s = document.body.style;
    s.overflow  = _savedBodyStyles.overflow;
    s.height    = _savedBodyStyles.height;
    s.minHeight = _savedBodyStyles.minHeight;
    s.margin    = _savedBodyStyles.margin;
    _savedBodyStyles = null;
  }

  return {
    setLang(lang) {
      _lang = (lang === 'en') ? 'en' : 'ru';
    },
    show() {
      saveBodyStyles();
      document.getElementById('cat-game-overlay').classList.add('visible');
      if (!_game) {
        _game = new Phaser.Game(cfg);
      } else {
        try { _game.scene.start('Game'); } catch(e) {
          _game.destroy(true);
          _game = new Phaser.Game(cfg);
        }
      }
    },
    hide() {
      document.getElementById('cat-game-overlay').classList.remove('visible');
      if (_game) { _game.destroy(true); _game = null; }
      const el = document.getElementById('cat-game');
      if (el) el.innerHTML = '';
      restoreBodyStyles();
    },
  };

})(); /* end CatGame IIFE */

/* ── Bind ALL .GameCatRunner buttons/links on the page ──────────
   Works for elements already in the DOM and those added later.
   ────────────────────────────────────────────────────────────── */
document.addEventListener('click', function(e) {
  const t = e.target.closest('.GameCatRunner, #GameCatRunner');
  if (t) {
    e.preventDefault();
    CatGame.show();
  }
});

/* Demo trigger button (only exists in this standalone demo file) */
const _demoBtn = document.getElementById('cat-egg-trigger');
if (_demoBtn) _demoBtn.addEventListener('click', () => CatGame.show());