"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Sıvı/gooey orb — ham WebGL, bağımlılık yok.
 *
 * Mantık: tam ekran bir dörtgen üzerinde fragment shader ile SDF raymarch.
 * Birden fazla küre "smooth minimum" ile birleştirilince damlalar birbirine
 * yapışıp akışkan bir kütle gibi davranıyor (metaball). Küre merkezleri
 * zamana bağlı sinüslerle dolaşıyor.
 *
 * Renk, yüzey normaline göre üç marka rengi arasında geçiyor; kenarda fresnel
 * ile ince bir ışık halkası var. Neon değil, cam/porselen hissi hedeflendi.
 */

type LiquidOrbProps = {
  /** Degrade sırası: koyu → orta → açık. */
  colors?: [string, string, string];
  /** Genel parlaklık çarpanı. 1 = varsayılan. */
  intensity?: number;
  /** Animasyon hızı çarpanı. 1 = varsayılan. */
  speed?: number;
  className?: string;
};

const DEFAULT_COLORS: [string, string, string] = ["#1A5CFF", "#0FBFD8", "#16E0B4"];

/** "#1A5CFF" → [0.10, 0.36, 1.0] */
function hexToRgb(hex: string): [number, number, number] {
  const v = hex.replace("#", "");
  const full = v.length === 3 ? v.split("").map((c) => c + c).join("") : v;
  const n = parseInt(full, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

const VERTEX_SHADER = `
attribute vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

/**
 * STEPS ve PRECISION derleme anında enjekte edilir: GLSL ES 1.0'da döngü
 * sınırı sabit olmak zorunda, bu yüzden kaliteyi çalışma anında değil
 * shader'ı derlerken seçiyoruz.
 */
const fragmentShader = (
  steps: number,
  shadowSteps: number,
  aoTaps: number,
  precision: "highp" | "mediump",
) => `
precision ${precision} float;

uniform vec2  uResolution;
uniform float uTime;
uniform vec3  uColorA;
uniform vec3  uColorB;
uniform vec3  uColorC;
uniform float uIntensity;

#define STEPS ${steps}
#define SHADOW_STEPS ${shadowSteps}
#define AO_TAPS ${aoTaps}

// Yumuşak minimum: iki yüzey yaklaşınca sert kesişme yerine akışkan bir
// köprü oluşturur — "gooey" görünümün tamamı buradan geliyor.
float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

float sdSphere(vec3 p, float r) {
  return length(p) - r;
}

// Ana kütle + yörüngede dolaşan üç damla.
float map(vec3 p) {
  float t = uTime;
  float d = sdSphere(p, 0.70);

  d = smin(d, sdSphere(p - vec3(
    sin(t * 0.70) * 0.55,
    cos(t * 0.90) * 0.40,
    sin(t * 0.50) * 0.30), 0.34), 0.38);

  d = smin(d, sdSphere(p - vec3(
    cos(t * 0.55 + 1.1) * 0.58,
    sin(t * 0.75 + 0.4) * 0.48,
    cos(t * 0.65) * 0.26), 0.29), 0.34);

  d = smin(d, sdSphere(p - vec3(
    sin(t * 0.95 + 1.7) * 0.44,
    cos(t * 0.60 + 2.1) * 0.54,
    sin(t * 0.80 + 0.9) * 0.34), 0.24), 0.30);

  return d;
}

vec3 calcNormal(vec3 p) {
  vec2 e = vec2(0.0018, 0.0);
  return normalize(vec3(
    map(p + e.xyy) - map(p - e.xyy),
    map(p + e.yxy) - map(p - e.yxy),
    map(p + e.yyx) - map(p - e.yyx)));
}

/**
 * Yumuşak gölge: yüzeyden ışığa doğru ikinci bir ışın yürütülür. Işının
 * yol boyunca yüzeye ne kadar yaklaştığı (h/t oranı) penumbra genişliğini
 * verir — sert bir gölge testi yerine damlaların birbirine düşürdüğü
 * yumuşak geçişler oluşur.
 */
float softShadow(vec3 ro, vec3 rd) {
  float res = 1.0;
  float t = 0.03;
  for (int i = 0; i < SHADOW_STEPS; i++) {
    float h = map(ro + rd * t);
    res = min(res, 10.0 * h / t);
    if (res < 0.005) break;
    t += clamp(h, 0.03, 0.22);
    if (t > 3.0) break;
  }
  return clamp(res, 0.0, 1.0);
}

/**
 * Ortam örtüşmesi: normal boyunca kısa mesafelerde yüzeyin ne kadar
 * "geri geldiğine" bakar. Damlaların kaynaştığı çukurları karartır —
 * gooey birleşmeyi asıl okunur kılan şey bu.
 */
#define AO_RADIUS 0.26

float ambientOcclusion(vec3 p, vec3 n) {
  float occ = 0.0;
  float sca = 1.0;
  for (int i = 0; i < AO_TAPS; i++) {
    // Örnekleme yarıçapı damla ölçeğiyle aynı büyüklükte olmalı; küçük
    // tutulduğunda (ilk denemede 0.11) yüzey her yerde "açık" ölçülüyor ve
    // AO hiç sinyal üretmiyordu.
    float h = 0.02 + AO_RADIUS * float(i) / float(AO_TAPS - 1);
    float d = map(p + n * h);
    occ += (h - d) * sca;
    sca *= 0.80;
  }
  return clamp(1.0 - 1.8 * occ / AO_RADIUS, 0.0, 1.0);
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - uResolution) / min(uResolution.x, uResolution.y);

  vec3 ro = vec3(0.0, 0.0, 2.60);
  vec3 rd = normalize(vec3(uv, -1.75));

  float t = 0.0;
  float hit = 0.0;
  // Işının yüzeye en çok yaklaştığı mesafe: siluet kenarını yumuşatmak ve
  // dışarıda ince bir hale üretmek için kullanılıyor (ayrı blur geçişi yok).
  float nearest = 1e9;

  for (int i = 0; i < STEPS; i++) {
    vec3 p = ro + rd * t;
    float d = map(p);
    nearest = min(nearest, d);
    if (d < 0.0012) { hit = 1.0; break; }
    t += d;
    if (t > 6.0) break;
  }

  vec4 outColor = vec4(0.0);

  if (hit > 0.5) {
    vec3 p = ro + rd * t;
    vec3 n = calcNormal(p);

    // Normalin dikey bileşeni degradeyi sürüyor: alt koyu mavi, üst mint.
    float g = clamp(n.y * 0.5 + 0.5, 0.0, 1.0);
    vec3 base = mix(uColorA, uColorB, smoothstep(0.02, 0.58, g));
    base = mix(base, uColorC, smoothstep(0.52, 1.0, g));

    vec3 lightDir = normalize(vec3(-0.35, 0.80, 0.55));
    float diff = clamp(dot(n, lightDir) * 0.5 + 0.5, 0.0, 1.0);

    float shadow = softShadow(p + n * 0.02, lightDir);
    float occ = ambientOcclusion(p, n);

    // Kenara doğru artan ışık — cam hissi. Üstel yüksek tutuldu ki
    // yüzeyin tamamı parlamasın, yalnızca silüet kenarı aydınlansın.
    float fres = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);

    // Ortam ışığı AO ile, doğrudan ışık gölgeyle kısılıyor. Gölge tam
    // karartmıyor (0.45 taban): premium/yumuşak görünüm için kontrast düşük.
    // AO ağırlıklı olarak ortam ışığını kısar (fiziksel olarak doğrusu bu);
    // doğrudan ışığa da hafif bir pay veriliyor ki çukurlar okunsun.
    float ambient = 0.34 * occ;
    float direct = 0.70 * diff * mix(0.45, 1.0, shadow) * mix(0.78, 1.0, occ);

    vec3 c = base * (ambient + direct);
    c += fres * mix(uColorB, uColorC, 0.45) * 0.45 * occ;

    float spec = pow(max(dot(reflect(-lightDir, n), -rd), 0.0), 32.0);
    c += spec * 0.18 * shadow;

    outColor = vec4(c * uIntensity, 1.0);
  } else {
    // Silüetin hemen dışında yumuşak geçiş: hem kenar yumuşatma hem hafif hale.
    float halo = 1.0 - smoothstep(0.0, 0.30, nearest);
    halo = pow(halo, 2.2) * 0.34;
    outColor = vec4(mix(uColorA, uColorB, 0.5) * uIntensity, halo);
  }

  gl_FragColor = outColor;
}
`;

function compile(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
  label: string,
) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    console.error(
      `[LiquidOrb] ${label} shader derlenemedi:`,
      log,
      "\n",
      source.split("\n").map((l, i) => `${i + 1}: ${l}`).join("\n"),
    );
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function LiquidOrb({
  colors = DEFAULT_COLORS,
  intensity = 1,
  speed = 1,
  className,
}: LiquidOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Değişebilen ayarları ref'te tutuyoruz: prop değişince WebGL bağlamını
  // yeniden kurmak yerine uniform güncellemek yeterli. Yazma render sırasında
  // değil effect içinde yapılıyor (render saf kalmalı).
  const settings = useRef({ colors, intensity, speed });
  useEffect(() => {
    settings.current = { colors, intensity, speed };
  }, [colors, intensity, speed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const narrow = window.innerWidth < 768;
    const lowPower = coarse || narrow || (navigator.hardwareConcurrency ?? 8) <= 4;

    // Mobilde hem çözünürlük hem raymarch adımı düşürülüyor: bu shader'ın
    // maliyeti neredeyse tamamen piksel × adım sayısı.
    const maxDpr = lowPower ? 1.5 : 2;
    const steps = lowPower ? 28 : 56;
    // Gölge ve AO yalnızca yüzeye çarpan piksellerde çalışır; yine de
    // mobilde ikisini de belirgin şekilde kısıyoruz.
    const shadowSteps = lowPower ? 8 : 20;
    const aoTaps = lowPower ? 3 : 5;

    const gl = canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "low-power",
      failIfMajorPerformanceCaveat: false,
    });

    // WebGL yoksa sessizce boş kal — CSS'teki radyal parıltı yerinde kalır.
    if (!gl) return;

    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER, "vertex");
    const fs = compile(
      gl,
      gl.FRAGMENT_SHADER,
      fragmentShader(steps, shadowSteps, aoTaps, lowPower ? "mediump" : "highp"),
      "fragment",
    );
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("[LiquidOrb] program bağlanamadı:", gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);

    // Tam ekran dörtgen (iki üçgen)
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    const aPosition = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    const u = {
      resolution: gl.getUniformLocation(program, "uResolution"),
      time: gl.getUniformLocation(program, "uTime"),
      colorA: gl.getUniformLocation(program, "uColorA"),
      colorB: gl.getUniformLocation(program, "uColorB"),
      colorC: gl.getUniformLocation(program, "uColorC"),
      intensity: gl.getUniformLocation(program, "uIntensity"),
    };

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    let width = 0;
    let height = 0;

    function resize() {
      if (!gl || !canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));
      if (w === width && h === height) return;
      width = w;
      height = h;
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }

    function draw(seconds: number) {
      if (!gl) return;
      const { colors: c, intensity: i } = settings.current;
      gl.uniform2f(u.resolution, width, height);
      gl.uniform1f(u.time, seconds);
      gl.uniform3fv(u.colorA, hexToRgb(c[0]));
      gl.uniform3fv(u.colorB, hexToRgb(c[1]));
      gl.uniform3fv(u.colorC, hexToRgb(c[2]));
      gl.uniform1f(u.intensity, i);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    resize();

    let frame = 0;
    let visible = true;
    let elapsed = 0;
    let last = performance.now();

    function loop(now: number) {
      // Sekme gizliyken rAF zaten durur; burada süreyi de dondurup geri
      // dönüldüğünde animasyonun sıçramasını engelliyoruz.
      const delta = Math.min((now - last) / 1000, 0.05);
      last = now;
      elapsed += delta * settings.current.speed;
      resize();
      draw(elapsed);
      frame = requestAnimationFrame(loop);
    }

    function start() {
      if (frame || !visible) return;
      last = performance.now();
      frame = requestAnimationFrame(loop);
    }

    function stop() {
      if (!frame) return;
      cancelAnimationFrame(frame);
      frame = 0;
    }

    if (reduceMotion) {
      // Hareket azaltma açıksa tek kare çiz ve döngüyü hiç başlatma.
      draw(0);
    } else {
      start();
    }

    // Ekrandan çıkınca render etmeyi bırak.
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (reduceMotion) return;
        if (visible) start();
        else stop();
      },
      { threshold: 0 },
    );
    io.observe(canvas);

    const onVisibility = () => {
      if (reduceMotion) return;
      if (document.hidden) stop();
      else start();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const ro = new ResizeObserver(() => {
      resize();
      if (reduceMotion) draw(0);
    });
    ro.observe(canvas);

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      // loseContext() bilinçli olarak çağrılmıyor: React StrictMode effect'i
      // iki kez çalıştırıyor ve aynı canvas aynı bağlamı döndürdüğü için
      // bağlamı öldürmek ikinci mount'u bozuyor. Kaynaklar zaten yukarıda
      // siliniyor, canvas kaldırılınca bağlam de GC ediliyor.
    };
  }, []);

  return (
    <div className={cn("relative isolate", className)} aria-hidden>
      {/* Arkadaki yumuşak hale CSS ile: shader'da ikinci bir geçiş yapmaktan
          hem daha ucuz hem daha kontrollü. */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 blur-2xl"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(15,191,216,0.18) 0%, rgba(26,92,255,0.10) 38%, transparent 68%)",
        }}
      />
      <canvas ref={canvasRef} className="size-full" />
    </div>
  );
}
