// WebGL plasma shader background — sin dependencias externas
// Adaptado para Vite + React + TypeScript estricto (sin any, sin console.log)
import { useEffect, useRef } from 'react'

// ─── Shaders fuera del componente para evitar recreación en renders ──────────

const VS_SOURCE = `
  attribute vec4 aVertexPosition;
  void main() {
    gl_Position = aVertexPosition;
  }
`

const FS_SOURCE = `
  precision highp float;
  uniform vec2 iResolution;
  uniform float iTime;

  const float overallSpeed      = 0.2;
  const float gridSmoothWidth   = 0.015;
  const float axisWidth         = 0.05;
  const float majorLineWidth    = 0.025;
  const float minorLineWidth    = 0.0125;
  const float majorLineFrequency = 5.0;
  const float minorLineFrequency = 1.0;
  const float scale             = 5.0;
  const vec4  lineColor         = vec4(0.4, 0.2, 0.8, 1.0);
  const float minLineWidth      = 0.01;
  const float maxLineWidth      = 0.2;
  const float lineSpeed         = 1.0  * overallSpeed;
  const float lineAmplitude     = 1.0;
  const float lineFrequency     = 0.2;
  const float warpSpeed         = 0.2  * overallSpeed;
  const float warpFrequency     = 0.5;
  const float warpAmplitude     = 1.0;
  const float offsetFrequency   = 0.5;
  const float offsetSpeed       = 1.33 * overallSpeed;
  const float minOffsetSpread   = 0.6;
  const float maxOffsetSpread   = 2.0;
  const int   linesPerGroup     = 16;

  #define drawCircle(pos, radius, coord) \
    smoothstep(radius + gridSmoothWidth, radius, length(coord - (pos)))
  #define drawSmoothLine(pos, halfWidth, t) \
    smoothstep(halfWidth, 0.0, abs(pos - (t)))
  #define drawCrispLine(pos, halfWidth, t) \
    smoothstep(halfWidth + gridSmoothWidth, halfWidth, abs(pos - (t)))
  #define drawPeriodicLine(freq, width, t) \
    drawCrispLine(freq / 2.0, width, abs(mod(t, freq) - (freq) / 2.0))

  float random(float t) {
    return (cos(t) + cos(t * 1.3 + 1.3) + cos(t * 1.4 + 1.4)) / 3.0;
  }

  float getPlasmaY(float x, float horizontalFade, float offset) {
    return random(x * lineFrequency + iTime * lineSpeed) * horizontalFade
           * lineAmplitude + offset;
  }

  void main() {
    vec2 uv    = gl_FragCoord.xy / iResolution.xy;
    vec2 space = (gl_FragCoord.xy - iResolution.xy / 2.0) / iResolution.x
                 * 2.0 * scale;

    float horizontalFade = 1.0 - (cos(uv.x * 6.28) * 0.5 + 0.5);
    float verticalFade   = 1.0 - (cos(uv.y * 6.28) * 0.5 + 0.5);

    space.y += random(space.x * warpFrequency + iTime * warpSpeed)
               * warpAmplitude * (0.5 + horizontalFade);
    space.x += random(space.y * warpFrequency + iTime * warpSpeed + 2.0)
               * warpAmplitude * horizontalFade;

    vec4 lines    = vec4(0.0);
    vec4 bgColor1 = vec4(0.03, 0.04, 0.12, 1.0);
    vec4 bgColor2 = vec4(0.06, 0.03, 0.15, 1.0);

    for (int l = 0; l < linesPerGroup; l++) {
      float nli           = float(l) / float(linesPerGroup);
      float offsetPos     = float(l) + space.x * offsetFrequency;
      float rand          = random(offsetPos + iTime * offsetSpeed) * 0.5 + 0.5;
      float halfWidth     = mix(minLineWidth, maxLineWidth, rand * horizontalFade) / 2.0;
      float offset        = random(offsetPos + iTime * offsetSpeed * (1.0 + nli))
                            * mix(minOffsetSpread, maxOffsetSpread, horizontalFade);
      float linePos       = getPlasmaY(space.x, horizontalFade, offset);
      float line          = drawSmoothLine(linePos, halfWidth, space.y) / 2.0
                            + drawCrispLine(linePos, halfWidth * 0.15, space.y);

      float circleX       = mod(float(l) + iTime * lineSpeed, 25.0) - 12.0;
      vec2  circlePos     = vec2(circleX, getPlasmaY(circleX, horizontalFade, offset));
      float circle        = drawCircle(circlePos, 0.01, space) * 4.0;

      lines += (line + circle) * lineColor * rand;
    }

    vec4 fragColor  = mix(bgColor1, bgColor2, uv.x);
    fragColor      *= verticalFade;
    fragColor.a     = 1.0;
    fragColor      += lines;

    gl_FragColor = fragColor;
  }
`

// ─── Helpers WebGL con tipos explícitos (sin any) ────────────────────────────

function loadShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader | null {
  const shader = gl.createShader(type)
  if (!shader) return null

  gl.shaderSource(shader, source)
  gl.compileShader(shader)

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader)
    return null
  }

  return shader
}

function initShaderProgram(
  gl: WebGLRenderingContext,
  vs: string,
  fs: string,
): WebGLProgram | null {
  const vertex   = loadShader(gl, gl.VERTEX_SHADER, vs)
  const fragment = loadShader(gl, gl.FRAGMENT_SHADER, fs)
  if (!vertex || !fragment) return null

  const program = gl.createProgram()
  if (!program) return null

  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  gl.linkProgram(program)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null

  return program
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function ShaderBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl')
    if (!gl) return

    const program = initShaderProgram(gl, VS_SOURCE, FS_SOURCE)
    if (!program) return

    const positionBuffer = gl.createBuffer()
    if (!positionBuffer) return

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    )

    const vertexLoc     = gl.getAttribLocation(program, 'aVertexPosition')
    const resolutionLoc = gl.getUniformLocation(program, 'iResolution')
    const timeLoc       = gl.getUniformLocation(program, 'iTime')

    const resize = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
      gl.viewport(0, 0, canvas.width, canvas.height)
    }

    window.addEventListener('resize', resize)
    resize()

    const startTime = Date.now()
    let animId      = 0

    const render = () => {
      const t = (Date.now() - startTime) / 1000

      gl.clearColor(0, 0, 0, 1)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.useProgram(program)

      gl.uniform2f(resolutionLoc, canvas.width, canvas.height)
      gl.uniform1f(timeLoc, t)

      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
      gl.vertexAttribPointer(vertexLoc, 2, gl.FLOAT, false, 0, 0)
      gl.enableVertexAttribArray(vertexLoc)

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      animId = requestAnimationFrame(render)
    }

    animId = requestAnimationFrame(render)

    // Limpieza al desmontar: cancela el loop y libera el event listener
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        pointerEvents: 'none',
      }}
    />
  )
}
