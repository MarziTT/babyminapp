const app = getApp()
var H = require('../../utils/helpers')

// ==================== 音频合成辅助 ====================

// 一阶低通滤波
function lowPass(input, prev, cutoff, sampleRate) {
  var dt = 1.0 / sampleRate
  var rc = 1.0 / (2.0 * Math.PI * cutoff)
  var alpha = dt / (rc + dt)
  return prev + alpha * (input - prev)
}

// 一阶高通滤波
function highPass(input, prevIn, prevOut, cutoff, sampleRate) {
  var dt = 1.0 / sampleRate
  var rc = 1.0 / (2.0 * Math.PI * cutoff)
  var alpha = rc / (rc + dt)
  var out = alpha * (prevOut + input - prevIn)
  return { output: out, prevIn: input, prevOut: out }
}

// ==================== 噪声生成算法 ====================

function generateWhiteNoise(duration, sampleRate) {
  var length = sampleRate * duration
  var data = new Float32Array(length)
  var lp = 0
  for (var i = 0; i < length; i++) {
    var raw = Math.random() * 2 - 1
    lp = lowPass(raw, lp, 4500, sampleRate)
    data[i] = lp * 0.28
  }
  return data
}

function generatePinkNoise(duration, sampleRate) {
  var length = sampleRate * duration
  var data = new Float32Array(length)
  var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
  var lp = 0
  for (var i = 0; i < length; i++) {
    var white = Math.random() * 2 - 1
    b0 = 0.99886 * b0 + white * 0.0555179
    b1 = 0.99332 * b1 + white * 0.0750759
    b2 = 0.96900 * b2 + white * 0.1538520
    b3 = 0.86650 * b3 + white * 0.3104856
    b4 = 0.55000 * b4 + white * 0.5329522
    b5 = -0.7616 * b5 - white * 0.0168980
    var pink = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
    b6 = white * 0.115926
    lp = lowPass(pink * 3.5, lp, 2000, sampleRate)
    data[i] = lp * 0.45
  }
  return data
}

function generateBrownNoise(duration, sampleRate) {
  var length = sampleRate * duration
  var data = new Float32Array(length)
  var last = 0
  var lp = 0
  for (var i = 0; i < length; i++) {
    last = (last + 0.008 * (Math.random() * 2 - 1)) / 1.008
    lp = lowPass(last, lp, 350, sampleRate)
    data[i] = lp * 0.55
  }
  return data
}

function generateFanNoise(duration, sampleRate) {
  var length = sampleRate * duration
  var data = new Float32Array(length)
  var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
  var lp = 0
  for (var i = 0; i < length; i++) {
    var white = Math.random() * 2 - 1
    b0 = 0.99886 * b0 + white * 0.0555179
    b1 = 0.99332 * b1 + white * 0.0750759
    b2 = 0.96900 * b2 + white * 0.1538520
    b3 = 0.86650 * b3 + white * 0.3104856
    b4 = 0.55000 * b4 + white * 0.5329522
    b5 = -0.7616 * b5 - white * 0.0168980
    var pink = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
    b6 = white * 0.115926
    lp = lowPass(pink, lp, 800, sampleRate)
    var t = i / sampleRate
    var hum = Math.sin(2 * Math.PI * 110 * t) * 0.12 + Math.sin(2 * Math.PI * 220 * t) * 0.06
    data[i] = lp * 0.6 + hum
  }
  return data
}

function generateRain(duration, sampleRate) {
  var length = sampleRate * duration
  var data = new Float32Array(length)
  var lp = 0, prevOut = 0, prevIn = 0
  for (var i = 0; i < length; i++) {
    var raw = Math.random() * 2 - 1
    lp = lowPass(raw, lp, 3000, sampleRate)
    var hp = highPass(lp, prevIn, prevOut, 400, sampleRate)
    prevIn = lp; prevOut = hp.output

    // 模仿雨滴密度的随机调制
    var mod = 1.0 + 0.3 * Math.sin(i / sampleRate * 0.7)
    data[i] = hp.output * 0.35 * mod
  }
  return data
}

function generateStream(duration, sampleRate) {
  var length = sampleRate * duration
  var data = new Float32Array(length)
  var lp = 0, prevOut = 0, prevIn = 0
  for (var i = 0; i < length; i++) {
    var raw = Math.random() * 2 - 1
    lp = lowPass(raw, lp, 5000, sampleRate)
    var hp = highPass(lp, prevIn, prevOut, 600, sampleRate)
    prevIn = lp; prevOut = hp.output

    // 溪流的快速调制
    var mod = 1.0 + 0.25 * Math.sin(i / sampleRate * 2.3)
      + 0.15 * Math.sin(i / sampleRate * 5.1 + 1.7)
    data[i] = hp.output * 0.3 * mod
  }
  return data
}

function generateOcean(duration, sampleRate) {
  var length = sampleRate * duration
  var data = new Float32Array(length)
  var last = 0
  var lp = 0
  for (var i = 0; i < length; i++) {
    last = (last + 0.006 * (Math.random() * 2 - 1)) / 1.006
    lp = lowPass(last, lp, 300, sampleRate)
    // 缓慢的波浪起伏
    var wave = 0.5 + 0.5 * Math.sin(i / sampleRate * 0.12 + Math.sin(i / sampleRate * 0.05) * 0.6)
    data[i] = lp * 0.5 * (0.3 + 0.7 * wave)
  }
  return data
}

function generateWind(duration, sampleRate) {
  var length = sampleRate * duration
  var data = new Float32Array(length)
  var lp = 0, prevOut = 0, prevIn = 0
  for (var i = 0; i < length; i++) {
    var raw = Math.random() * 2 - 1
    lp = lowPass(raw, lp, 6000, sampleRate)
    var hp = highPass(lp, prevIn, prevOut, 500, sampleRate)
    prevIn = lp; prevOut = hp.output

    // 风声起伏
    var mod = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(i / sampleRate * 0.3 + Math.sin(i / sampleRate * 0.08) * 1.2))
    data[i] = hp.output * 0.3 * mod
  }
  return data
}

function generateLullaby(duration, sampleRate) {
  var length = sampleRate * duration
  var data = new Float32Array(length)
  var notes = [
    261.63, 261.63, 392.00, 392.00, 440.00, 440.00, 392.00,
    349.23, 349.23, 329.63, 329.63, 293.66, 293.66, 261.63,
    392.00, 392.00, 349.23, 349.23, 329.63, 329.63, 293.66,
    392.00, 392.00, 349.23, 349.23, 329.63, 329.63, 293.66,
    261.63, 261.63, 392.00, 392.00, 440.00, 440.00, 392.00,
    349.23, 349.23, 329.63, 329.63, 293.66, 293.66, 261.63
  ]
  var noteDuration = sampleRate * 0.65
  var totalNotes = Math.min(notes.length, Math.floor(length / noteDuration))
  for (var n = 0; n < totalNotes; n++) {
    var freq = notes[n]
    var start = n * noteDuration
    var end = Math.min(start + noteDuration, length)
    for (var i = start; i < end; i++) {
      var t = i / sampleRate
      var env = Math.min(1, (i - start) / (sampleRate * 0.02)) * Math.max(0, 1 - (i - (end - sampleRate * 0.1)) / (sampleRate * 0.1))
      data[i] += (Math.sin(2 * Math.PI * freq * t) + Math.sin(2 * Math.PI * freq * 2 * t) * 0.1) * env * 0.04
    }
  }
  return data
}

function generateHeartbeat(duration, sampleRate) {
  var length = sampleRate * duration
  var data = new Float32Array(length)
  var bpm = 72
  var beatInterval = sampleRate * (60 / bpm)
  var lp = 0
  for (var i = 0; i < length; i++) {
    // 低频背景
    var raw = Math.random() * 2 - 1
    lp = lowPass(raw, lp, 250, sampleRate)
    data[i] = lp * 0.12

    // 心跳脉冲 - 两个短拍（lub-dub）
    var phaseInBeat = (i % beatInterval) / beatInterval
    var pulse = 0
    var t = i / sampleRate
    var freq = 55
    if (phaseInBeat < 0.04) {
      var env = Math.sin(phaseInBeat / 0.04 * Math.PI)
      pulse = Math.sin(2 * Math.PI * freq * t) * env * 0.55
    } else if (phaseInBeat > 0.14 && phaseInBeat < 0.19) {
      var env2 = Math.sin((phaseInBeat - 0.14) / 0.05 * Math.PI)
      pulse = Math.sin(2 * Math.PI * freq * 1.3 * t) * env2 * 0.4
    }
    data[i] += pulse
  }
  return data
}

function generateHairdryer(duration, sampleRate) {
  var length = sampleRate * duration
  var data = new Float32Array(length)
  var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
  var lp = 0
  for (var i = 0; i < length; i++) {
    var white = Math.random() * 2 - 1
    b0 = 0.99886 * b0 + white * 0.0555179
    b1 = 0.99332 * b1 + white * 0.0750759
    b2 = 0.96900 * b2 + white * 0.1538520
    b3 = 0.86650 * b3 + white * 0.3104856
    b4 = 0.55000 * b4 + white * 0.5329522
    b5 = -0.7616 * b5 - white * 0.0168980
    var pink = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
    b6 = white * 0.115926
    lp = lowPass(pink, lp, 2500, sampleRate)
    var t = i / sampleRate
    var hum = Math.sin(2 * Math.PI * 100 * t) * 0.15 + Math.sin(2 * Math.PI * 200 * t) * 0.07
    data[i] = lp * 0.7 + hum
  }
  return data
}

function generateWomb(duration, sampleRate) {
  var length = sampleRate * duration
  var data = new Float32Array(length)
  var last = 0
  var lp = 0
  var bpm = 80
  var beatInterval = sampleRate * (60 / bpm)
  for (var i = 0; i < length; i++) {
    last = (last + 0.004 * (Math.random() * 2 - 1)) / 1.004
    lp = lowPass(last, lp, 200, sampleRate)
    data[i] = lp * 0.55

    // 远处心跳
    var phaseInBeat = (i % beatInterval) / beatInterval
    if (phaseInBeat < 0.03) {
      var env = Math.sin(phaseInBeat / 0.03 * Math.PI)
      var t = i / sampleRate
      data[i] += Math.sin(2 * Math.PI * 50 * t) * env * 0.2
    } else if (phaseInBeat > 0.13 && phaseInBeat < 0.17) {
      var env2 = Math.sin((phaseInBeat - 0.13) / 0.04 * Math.PI)
      var t2 = i / sampleRate
      data[i] += Math.sin(2 * Math.PI * 65 * t2) * env2 * 0.15
    }
    data[i] = Math.max(-0.65, Math.min(0.65, data[i]))
  }
  return data
}

// ==================== 声音配置 ====================

var SOUNDS = [
  { id: 'brown-noise', name: '棕色噪音',   icon: '🔊', category: 'white',  desc: '深沉的隆隆声，如远方雷鸣',        generator: 'brown' },
  { id: 'hairdryer',  name: '吹风机声',   icon: '🌀', category: 'white',  desc: '平稳白噪音，模拟吹风机运行声',     generator: 'hairdryer' },
  { id: 'stream',     name: '溪流声',     icon: '🏞', category: 'nature', desc: '潺潺流水，仿佛山间小溪旁',        generator: 'stream' },
  { id: 'ocean',      name: '海浪声',     icon: '🌊', category: 'nature', desc: '阵阵海浪起伏，节奏舒缓自然',      generator: 'ocean' },
  { id: 'lullaby',    name: '摇篮曲',     icon: '🚼', category: 'lullaby', desc: '轻柔旋律，帮助宝宝平静入睡',      generator: 'lullaby' },
  { id: 'heartbeat',  name: '心跳声',     icon: '❤️', category: 'lullaby', desc: '稳定 lub-dub 节奏，模拟母体',     generator: 'heartbeat' },
  { id: 'womb',       name: '子宫声',     icon: '👶', category: 'lullaby', desc: '子宫内环境声，给宝宝最大安全感',   generator: 'womb' }
]

var CATEGORIES = [
  { key: 'white',   name: '白噪音' },
  { key: 'nature',  name: '自然声' },
  { key: 'lullaby', name: '哄睡' }
]


Page({
  data: {
    sounds: SOUNDS,
    categories: CATEGORIES,
    activeCategory: 'white',
    currentSound: null,
    isPlaying: false,
    volume: 80,
    timerEnabled: false,
    timerMinutes: 30,
    timerRemaining: 0,
    showTimerPicker: false,
    loadError: false,
    generating: false
  },

  audioCtx: null,
  countdownTimer: null,
  currentSoundId: null,
  isGenerating: false,

  onLoad: function () {
    try {
      this.audioCtx = wx.createWebAudioContext()
      this._sampleRate = this.audioCtx.sampleRate || 44100
    } catch (e) {
      console.error('[Player] WebAudioContext 创建失败:', e)
      this.setData({ loadError: true })
    }
  },

  onUnload: function () {
    this.stopPlayback()
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer)
    }
    if (this.audioCtx) {
      try { this.audioCtx.close() } catch (e) {}
    }
  },

  switchCategory: function (e) {
    var key = e.currentTarget.dataset.key
    this.setData({ activeCategory: key })
  },

  filteredSounds: function () {
    var activeCategory = this.data.activeCategory
    return this.data.sounds.filter(function (s) {
      return s.category === activeCategory
    })
  },

  selectSound: function (e) {
    var soundId = e.currentTarget.dataset.id
    var sound = this.data.sounds.find(function (s) { return s.id === soundId })
    if (!sound) return

    // 点击正在播放的声音 → 切换播放/暂停
    if (this.data.currentSound && this.data.currentSound.id === sound.id) {
      this.togglePlay()
      return
    }

    this.stopPlayback()
    this.setData({ currentSound: sound, isPlaying: false, loadError: false })
    this.startPlayback(sound)
  },

  togglePlay: function () {
    if (!this.data.currentSound) return
    if (this.data.isPlaying) {
      this.pausePlayback()
    } else {
      this.resumePlayback()
    }
  },

  enableTimer: function () {
    this.setData({ showTimerPicker: true })
  },

  onTimerMinutesChange: function (e) {
    var minutes = parseInt(e.detail.value) || 30
    this.setData({ timerMinutes: Math.max(1, Math.min(120, minutes)) })
  },

  confirmTimer: function () {
    var seconds = this.data.timerMinutes * 60
    this.setData({ timerEnabled: true, timerRemaining: seconds, showTimerPicker: false })
    this.startCountdown()
  },

  cancelTimerPicker: function () {
    this.setData({ showTimerPicker: false })
  },

  disableTimer: function () {
    this.stopCountdown()
    this.setData({ timerEnabled: false, timerRemaining: 0 })
  },

  startCountdown: function () {
    this.stopCountdown()
    var self = this
    this.countdownTimer = setInterval(function () { self.onCountdownTick() }, 1000)
  },

  stopCountdown: function () {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer)
      this.countdownTimer = null
    }
  },

  onCountdownTick: function () {
    var remaining = this.data.timerRemaining - 1
    if (remaining <= 0) {
      this.stopCountdown()
      this.setData({ timerRemaining: 0, timerEnabled: false })
      this.stopPlayback()
      this.setData({ isPlaying: false })
      wx.showToast({ title: '定时关闭已到', icon: 'none' })
    } else {
      this.setData({ timerRemaining: remaining })
    }
  },

  // ==================== 核心播放逻辑 ====================

  _audioSource: null,
  _audioBuffer: null,

  startPlayback: function (sound) {
    if (this.isGenerating) return
    this.isGenerating = true
    this.setData({ generating: true })

    var that = this
    var sampleRate = this._sampleRate
    var duration = 30  // 生成 30 秒循环段

    // 异步生成，避免阻塞 UI
    setTimeout(function () {
      try {
        var gen = sound.generator
        var floatData = null

        if (gen === 'brown') floatData = generateBrownNoise(duration, sampleRate)
        else if (gen === 'hairdryer') floatData = generateHairdryer(duration, sampleRate)
        else if (gen === 'stream')   floatData = generateStream(duration, sampleRate)
        else if (gen === 'ocean')    floatData = generateOcean(duration, sampleRate)
        else if (gen === 'lullaby')  floatData = generateLullaby(duration, sampleRate)
        else if (gen === 'heartbeat') floatData = generateHeartbeat(duration, sampleRate)
        else if (gen === 'womb')     floatData = generateWomb(duration, sampleRate)

        if (!floatData) {
          that.handlePlayError('生成音频失败')
          return
        }

        var ctx = that.audioCtx
        if (!ctx) {
          that.handlePlayError('音频上下文不可用')
          return
        }

        // 停止之前的播放
        that.stopSource()

        // 确保音频上下文处于运行态（切歌可能 suspend）
        try { ctx.resume() } catch (e) {}

        // 创建 AudioBuffer 并填入数据
        var buffer = ctx.createBuffer(1, floatData.length, sampleRate)
        var channelData = buffer.getChannelData(0)
        for (var i = 0; i < floatData.length; i++) {
          channelData[i] = floatData[i]
        }

        // 创建播放源
        var source = ctx.createBufferSource()
        source.buffer = buffer
        source.loop = true

        // 音量控制节点
        var gainNode = ctx.createGain()
        gainNode.gain.value = that.data.volume / 100

        source.connect(gainNode)
        gainNode.connect(ctx.destination)

        try { source.start(0) } catch (e) {
          console.error('[Player] start 失败:', e)
          // 重试：resume 后再 start
          try { ctx.resume() } catch (e2) {}
          try { source.start(0) } catch (e3) {}
        }

        that._audioSource = source
        that._gainNode = gainNode
        that._audioBuffer = buffer

        that.isGenerating = false
        that.setData({ isPlaying: true, loadError: false, generating: false })
      } catch (err) {
        console.error('[Player] 生成异常:', err)
        that.handlePlayError(err.message || '生成异常')
      }
    }, 50)
  },

  stopSource: function () {
    if (this._audioSource) {
      try { this._audioSource.stop() } catch (e) {}
      try { this._audioSource.disconnect() } catch (e) {}
      this._audioSource = null
    }
    if (this._gainNode) {
      try { this._gainNode.disconnect() } catch (e) {}
      this._gainNode = null
    }
  },

  pausePlayback: function () {
    if (this.audioCtx) {
      try { this.audioCtx.suspend() } catch (e) {}
    }
    this.setData({ isPlaying: false })
  },

  resumePlayback: function () {
    if (this.audioCtx) {
      try { this.audioCtx.resume() } catch (e) {}
    }
    this.setData({ isPlaying: true })
  },

  stopPlayback: function () {
    this.stopSource()
    this.isGenerating = false
  },

  onVolumeChange: function (e) {
    var volume = e.detail.value
    this.setData({ volume: volume })
    if (this._gainNode) {
      try { this._gainNode.gain.value = volume / 100 } catch (e) {}
    }
  },

  handlePlayError: function (msg) {
    this.isGenerating = false
    this.stopSource()
    this.setData({ isPlaying: false, loadError: true, generating: false })
    wx.showToast({ title: msg || '加载失败', icon: 'none', duration: 2000 })
  },

  // ==================== 格式化 ====================

  formatCountdown: function (seconds) {
    if (!seconds || seconds <= 0) return '00:00'
    var m = Math.floor(seconds / 60)
    var s = seconds % 60
    return H.pad2(m) + ':' + H.pad2(s)
  }
})
