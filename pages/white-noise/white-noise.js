/**
 * 白噪音播放页面
 * 使用 WebAudio 算法生成 PCM 数据 → WAV 临时文件 → InnerAudioContext 循环播放
 */

const SAMPLE_RATE = 44100
const DURATION_SEC = 5 // 每段 5 秒，循环播放
const NUM_CHANNELS = 1
const BIT_DEPTH = 16

// 白噪音类型
const NOISE_TYPES = [
  { id: 'white', name: '白噪音', icon: '⚪', desc: '均匀频谱噪声，适合掩盖环境杂音' },
  { id: 'pink', name: '粉红噪音', icon: '🩷', desc: '低频更突出，声音更柔和自然' },
  { id: 'rain', name: '雨声', icon: '🌧️', desc: '模拟淅沥雨声，助眠放松' },
  { id: 'fan', name: '风扇声', icon: '🌀', desc: '模拟风扇低频嗡嗡声' },
  { id: 'ocean', name: '海浪声', icon: '🌊', desc: '模拟海浪起伏的节奏' },
]

/**
 * 生成 WAV 文件头 (44 bytes)
 */
function createWavHeader(dataLength) {
  const buffer = new ArrayBuffer(44)
  const view = new DataView(buffer)
  const byteRate = SAMPLE_RATE * NUM_CHANNELS * (BIT_DEPTH / 8)
  const blockAlign = NUM_CHANNELS * (BIT_DEPTH / 8)

  // RIFF header
  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataLength, true) // 文件总长
  writeString(view, 8, 'WAVE')
  // fmt chunk
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true) // chunk size
  view.setUint16(20, 1, true)  // PCM = 1
  view.setUint16(22, NUM_CHANNELS, true)
  view.setUint32(24, SAMPLE_RATE, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, BIT_DEPTH, true)
  // data chunk
  writeString(view, 36, 'data')
  view.setUint32(40, dataLength, true)

  return buffer
}

function writeString(view, offset, str) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i))
  }
}

/**
 * 生成白噪音样本
 */
function generateWhiteNoise(samples) {
  const buffer = new Int16Array(samples)
  for (let i = 0; i < samples; i++) {
    buffer[i] = (Math.random() * 2 - 1) * 32767 * 0.5
  }
  return buffer
}

/**
 * 生成粉红噪音 (Voss-McCartney 算法)
 */
function generatePinkNoise(samples) {
  const buffer = new Int16Array(samples)
  const numGenerators = 8
  const generators = new Array(numGenerators).fill(0)
  let sum = 0

  for (let i = 0; i < samples; i++) {
    let k = 1
    for (let j = 0; j < numGenerators; j++) {
      if (i % k === 0) {
        sum -= generators[j]
        generators[j] = Math.random() * 2 - 1
        sum += generators[j]
      }
      k *= 2
    }
    buffer[i] = Math.max(-32767, Math.min(32767, (sum / numGenerators) * 32767 * 0.6))
  }
  return buffer
}

/**
 * 生成雨声样本（白噪音 + 随机包络模拟雨滴）
 */
function generateRainNoise(samples) {
  const buffer = new Int16Array(samples)
  // 雨滴参数
  const avgDropInterval = SAMPLE_RATE * 0.04 // 平均 40ms 一个雨滴
  const avgDropDuration = SAMPLE_RATE * 0.015 // 平均持续 15ms

  let nextDropAt = 0
  let dropEndAt = 0

  for (let i = 0; i < samples; i++) {
    if (i >= nextDropAt && i >= dropEndAt) {
      // 开始新雨滴
      dropEndAt = i + avgDropDuration * (0.5 + Math.random())
      nextDropAt = i + avgDropInterval * (0.3 + Math.random() * 1.4)
    }

    let sample = 0
    if (i < dropEndAt) {
      // 雨滴内部：高频噪声 + 指数衰减包络
      const elapsed = i - (dropEndAt - avgDropDuration * (0.5 + Math.random()))
      const envelope = Math.exp(-elapsed / (SAMPLE_RATE * 0.008)) // 快速衰减
      sample = (Math.random() * 2 - 1) * envelope * 0.8
    } else {
      // 背景：低强度噪声
      sample = (Math.random() * 2 - 1) * 0.08
    }

    buffer[i] = Math.max(-32767, Math.min(32767, sample * 32767))
  }
  return buffer
}

/**
 * 生成风扇声样本（低频带通噪声）
 */
function generateFanNoise(samples) {
  const buffer = new Int16Array(samples)
  // 简单 IIR 低通滤波器模拟风扇低频嗡嗡声
  let prev = 0

  for (let i = 0; i < samples; i++) {
    const noise = (Math.random() * 2 - 1) * 0.5
    // 低通滤波 (fc ~ 200Hz)
    const alpha = 0.03
    prev = prev + alpha * (noise - prev)
    // 加一个微弱的 60Hz 基频
    const hum = Math.sin(2 * Math.PI * 60 * i / SAMPLE_RATE) * 0.3
    const sample = (prev * 0.7 + hum) * 0.6
    buffer[i] = Math.max(-32767, Math.min(32767, sample * 32767))
  }
  return buffer
}

/**
 * 生成海浪声样本（低频噪声 + 振幅调制模拟波浪）
 */
function generateOceanNoise(samples) {
  const buffer = new Int16Array(samples)
  let prev = 0

  for (let i = 0; i < samples; i++) {
    const t = i / SAMPLE_RATE
    // 低频噪声
    const noise = (Math.random() * 2 - 1)
    const alpha = 0.02
    prev = prev + alpha * (noise - prev)

    // 振幅调制：模拟波浪起伏（周期约 4 秒）
    const waveEnvelope = 0.3 + 0.7 * Math.abs(Math.sin(2 * Math.PI * t / 4.0 + Math.sin(t * 0.5) * 0.5))

    // 另一个更快的调制层
    const rippleEnvelope = 1 + 0.15 * Math.sin(2 * Math.PI * t / 0.8)

    const sample = prev * waveEnvelope * rippleEnvelope * 0.7
    buffer[i] = Math.max(-32767, Math.min(32767, sample * 32767))
  }
  return buffer
}

// 生成器映射
const GENERATORS = {
  white: generateWhiteNoise,
  pink: generatePinkNoise,
  rain: generateRainNoise,
  fan: generateFanNoise,
  ocean: generateOceanNoise,
}

Page({
  data: {
    noises: NOISE_TYPES,
    playingMap: {}, // { id: true/false }
    loadingMap: {}, // { id: true/false }
  },

  onLoad() {
    this.audioCtxMap = {}  // { id: InnerAudioContext }
    this.filePathMap = {}  // { id: tempFilePath }
  },

  onUnload() {
    this._destroyAll()
  },

  _destroyAll() {
    const map = this.audioCtxMap || {}
    for (const id in map) {
      try {
        map[id].stop()
        map[id].destroy()
      } catch (e) { /* ignore */ }
    }
    this.audioCtxMap = {}

    // 清理临时文件
    const fpMap = this.filePathMap || {}
    for (const id in fpMap) {
      try {
        const fs = wx.getFileSystemManager()
        fs.unlinkSync(fpMap[id])
      } catch (e) { /* ignore */ }
    }
    this.filePathMap = {}
  },

  /**
   * 生成 WAV 文件并写入临时目录
   */
  _generateWavFile(noiseId) {
    if (this.filePathMap[noiseId]) {
      return Promise.resolve(this.filePathMap[noiseId])
    }

    return new Promise((resolve, reject) => {
      const generator = GENERATORS[noiseId]
      if (!generator) {
        reject(new Error('Unknown noise type: ' + noiseId))
        return
      }

      const totalSamples = SAMPLE_RATE * DURATION_SEC * NUM_CHANNELS

      // 在 Worker 之外直接用同步生成（5 秒数据量不大）
      const pcmData = generator(totalSamples)

      // 构建 WAV
      const pcmBytes = new Uint8Array(pcmData.buffer)
      const headerBuffer = createWavHeader(pcmBytes.byteLength)

      const wavBuffer = new ArrayBuffer(44 + pcmBytes.byteLength)
      const wavView = new Uint8Array(wavBuffer)
      wavView.set(new Uint8Array(headerBuffer), 0)
      wavView.set(pcmBytes, 44)

      const filePath = wx.env.USER_DATA_PATH + '/noise_' + noiseId + '.wav'
      const fs = wx.getFileSystemManager()

      fs.writeFile({
        filePath: filePath,
        data: wavBuffer.buffer,
        success: () => {
          this.filePathMap[noiseId] = filePath
          resolve(filePath)
        },
        fail: (err) => {
          reject(err)
        }
      })
    })
  },

  /**
   * 切换播放/停止
   */
  onToggleNoise(e) {
    const noiseId = e.currentTarget.dataset.id
    const isPlaying = this.data.playingMap[noiseId]

    if (isPlaying) {
      this._stopNoise(noiseId)
    } else {
      this._playNoise(noiseId)
    }
  },

  /**
   * 播放指定噪音
   */
  _playNoise(noiseId) {
    // 标记加载中
    this.setData({
      ['loadingMap.' + noiseId]: true
    })

    // 如果已有 audioCtx，直接 play
    if (this.audioCtxMap[noiseId]) {
      const ctx = this.audioCtxMap[noiseId]
      ctx.seek(0)
      ctx.play()
      this.setData({
        ['playingMap.' + noiseId]: true,
        ['loadingMap.' + noiseId]: false
      })
      return
    }

    this._generateWavFile(noiseId).then((filePath) => {
      const audioCtx = wx.createInnerAudioContext()
      audioCtx.src = filePath
      audioCtx.loop = true
      audioCtx.volume = 0.8

      audioCtx.onPlay(() => {
        this.setData({
          ['playingMap.' + noiseId]: true,
          ['loadingMap.' + noiseId]: false
        })
      })

      audioCtx.onError((err) => {
        console.error('[WhiteNoise] play error:', noiseId, err)
        wx.showToast({ title: '播放失败', icon: 'none' })
        this.setData({
          ['playingMap.' + noiseId]: false,
          ['loadingMap.' + noiseId]: false
        })
        // 清理失败上下文
        try { audioCtx.destroy() } catch (e) { /* ignore */ }
        delete this.audioCtxMap[noiseId]
      })

      this.audioCtxMap[noiseId] = audioCtx
      audioCtx.play()
    }).catch((err) => {
      console.error('[WhiteNoise] generate error:', noiseId, err)
      wx.showToast({ title: '生成音频失败', icon: 'none' })
      this.setData({ ['loadingMap.' + noiseId]: false })
    })
  },

  /**
   * 停止指定噪音
   */
  _stopNoise(noiseId) {
    const ctx = this.audioCtxMap[noiseId]
    if (ctx) {
      ctx.stop()
    }
    this.setData({ ['playingMap.' + noiseId]: false })
  },

  /**
   * 停止全部
   */
  onStopAll() {
    const playingMap = this.data.playingMap
    for (const id in playingMap) {
      if (playingMap[id]) {
        this._stopNoise(id)
      }
    }
  },
})
