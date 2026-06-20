var { getGrowthRecords, deleteGrowth } = require('../../utils/api')
var { getBabyId, getActiveBaby } = require('../../utils/baby')
var H = require('../../utils/helpers')

function formatDateDisplay(dateStr) {
  var today = H.nowDate()
  var d = new Date()
  d.setDate(d.getDate() - 1)
  var yesterday = d.getFullYear() + '-' + H.pad2(d.getMonth() + 1) + '-' + H.pad2(d.getDate())
  if (dateStr === today) return '今天'
  if (dateStr === yesterday) return '昨天'
  return dateStr
}

// ==================== WHO 标准百分位数据 ====================
var WHO_BOY_HEIGHT = {
  0: [46.1, 48.0, 49.9, 51.8, 53.7],
  1: [50.8, 52.8, 54.7, 56.7, 58.6],
  2: [54.4, 56.4, 58.4, 60.4, 62.4],
  3: [57.3, 59.4, 61.4, 63.5, 65.5],
  4: [59.7, 61.8, 63.9, 66.0, 68.0],
  5: [61.7, 63.8, 65.9, 68.0, 70.1],
  6: [63.3, 65.5, 67.6, 69.8, 71.9],
  8: [66.2, 68.4, 70.6, 72.8, 75.0],
  10: [68.7, 70.9, 73.2, 75.5, 77.8],
  12: [71.0, 73.3, 75.7, 78.0, 80.5],
  15: [74.1, 76.6, 79.1, 81.6, 84.2],
  18: [76.9, 79.6, 82.3, 85.0, 87.7],
  21: [79.4, 82.2, 85.1, 87.9, 90.9],
  24: [81.7, 84.8, 87.8, 90.9, 93.9],
  30: [85.6, 88.9, 92.1, 95.3, 98.5],
  36: [89.0, 92.4, 95.8, 99.2, 102.7]
}

var WHO_BOY_WEIGHT = {
  0: [2.5, 2.9, 3.3, 3.7, 4.1],
  1: [3.4, 3.9, 4.5, 5.1, 5.6],
  2: [4.3, 4.9, 5.6, 6.3, 7.0],
  3: [5.0, 5.7, 6.4, 7.2, 8.0],
  4: [5.5, 6.3, 7.0, 7.8, 8.7],
  5: [5.9, 6.7, 7.5, 8.4, 9.3],
  6: [6.3, 7.1, 7.9, 8.8, 9.8],
  8: [6.9, 7.7, 8.6, 9.6, 10.7],
  10: [7.4, 8.3, 9.2, 10.2, 11.4],
  12: [7.8, 8.8, 9.8, 10.9, 12.1],
  15: [8.5, 9.5, 10.6, 11.8, 13.2],
  18: [9.1, 10.2, 11.3, 12.6, 14.1],
  21: [9.7, 10.8, 12.0, 13.4, 15.0],
  24: [10.2, 11.4, 12.7, 14.2, 15.9],
  30: [11.2, 12.5, 13.9, 15.5, 17.4],
  36: [12.1, 13.5, 15.1, 16.8, 18.9]
}

var WHO_GIRL_HEIGHT = {
  0: [45.4, 47.3, 49.1, 51.0, 52.9],
  1: [49.8, 51.7, 53.7, 55.6, 57.6],
  2: [53.3, 55.3, 57.3, 59.3, 61.3],
  3: [56.2, 58.2, 60.2, 62.3, 64.3],
  4: [58.5, 60.6, 62.7, 64.8, 66.9],
  5: [60.4, 62.5, 64.7, 66.9, 69.0],
  6: [62.0, 64.2, 66.4, 68.6, 70.8],
  8: [64.9, 67.2, 69.4, 71.7, 74.0],
  10: [67.4, 69.7, 72.1, 74.4, 76.8],
  12: [69.8, 72.2, 74.6, 77.0, 79.5],
  15: [73.1, 75.6, 78.2, 80.7, 83.3],
  18: [76.0, 78.7, 81.3, 84.0, 86.7],
  21: [78.6, 81.4, 84.2, 87.0, 89.8],
  24: [81.1, 84.0, 86.9, 89.8, 92.7],
  30: [85.3, 88.4, 91.5, 94.6, 97.7],
  36: [88.8, 92.1, 95.4, 98.7, 102.0]
}

var WHO_GIRL_WEIGHT = {
  0: [2.4, 2.8, 3.2, 3.6, 4.0],
  1: [3.2, 3.6, 4.2, 4.7, 5.2],
  2: [4.0, 4.5, 5.1, 5.8, 6.5],
  3: [4.6, 5.2, 5.9, 6.6, 7.4],
  4: [5.1, 5.7, 6.4, 7.2, 8.1],
  5: [5.5, 6.1, 6.9, 7.7, 8.6],
  6: [5.8, 6.5, 7.3, 8.2, 9.1],
  8: [6.4, 7.1, 8.0, 8.9, 10.0],
  10: [6.9, 7.7, 8.6, 9.6, 10.7],
  12: [7.3, 8.2, 9.1, 10.2, 11.4],
  15: [8.0, 8.9, 10.0, 11.2, 12.5],
  18: [8.6, 9.6, 10.7, 12.0, 13.4],
  21: [9.2, 10.3, 11.5, 12.8, 14.3],
  24: [9.8, 10.9, 12.2, 13.6, 15.3],
  30: [10.8, 12.1, 13.5, 15.1, 16.9],
  36: [11.7, 13.1, 14.7, 16.4, 18.4]
}

var MONTH_KEYS = [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 18, 21, 24, 30, 36]

Page({
  data: {
    records: [],
    dateFrom: '',
    dateTo: '',
    dateFromDisplay: '不限',
    dateToDisplay: '不限',
    chartType: 'height',
    showChart: false,
    gender: 'boy'
  },

  onLoad: function () {
  },

  onShow: function () {
    this.loadRecords()
    var self = this
    var active = getActiveBaby()
    if (active) {
      self.setData({
        babyBirthday: active.birthday || '',
        gender: active.gender || 'boy'
      })
    }
  },

  loadRecords: function () {
    var self = this
    var babyId = getBabyId()
    if (!babyId) { console.error('growth: getBabyId() is empty'); return }
    getGrowthRecords(babyId, self.data.dateFrom, self.data.dateTo).then(function (data) {
      var records = (data || []).slice()
      records.sort(function (a, b) {
        return (a.record_date || '') > (b.record_date || '') ? 1 : -1
      })
      for (var i = 0; i < records.length; i++) {
        var r = records[i]
        if (i > 0) {
          var prev = records[i - 1]
          var hPrev = parseFloat(prev.height_cm) || 0
          var hCur = parseFloat(r.height_cm) || 0
          var wPrev = parseFloat(prev.weight_kg) || 0
          var wCur = parseFloat(r.weight_kg) || 0
          r.heightDelta = hPrev > 0 && hCur > 0 ? (hCur - hPrev).toFixed(1) : null
          r.weightDelta = wPrev > 0 && wCur > 0 ? (wCur - wPrev).toFixed(1) : null
        } else {
          r.heightDelta = null
          r.weightDelta = null
        }
        r.displayTime = H.formatDisplayTime(r.record_date || '')
      }
      self.setData({ records: records })
      if (records.length > 0 && self.data.showChart) {
        setTimeout(function () { self.drawChart() }, 300)
      }
    }).catch(function (err) {
      console.error('[Growth] 加载失败:', err)
      self.setData({ records: [] })
    })
  },

  /* ===== Chart ===== */

  toggleChart: function () {
    var show = !this.data.showChart
    this.setData({ showChart: show })
    if (show) {
      var self = this
      setTimeout(function () { self.drawChart() }, 200)
    }
  },

  switchChart: function (e) {
    var type = e.currentTarget.dataset.type
    this.setData({ chartType: type })
    var self = this
    setTimeout(function () { self.drawChart() }, 100)
  },

  switchGender: function (e) {
    var g = e.currentTarget.dataset.gender
    this.setData({ gender: g })
    var self = this
    setTimeout(function () { self.drawChart() }, 100)
  },

  drawChart: function () {
    var self = this
    var query = wx.createSelectorQuery().in(this)
    query.select('#growthChart')
      .fields({ node: true, size: true })
      .exec(function (res) {
        if (!res || !res[0] || !res[0].node) return
        var canvas = res[0].node
        var ctx = canvas.getContext('2d')
        var dpr = wx.getSystemInfoSync().pixelRatio
        var width = res[0].width
        var height = res[0].height
        canvas.width = width * dpr
        canvas.height = height * dpr
        ctx.scale(dpr, dpr)

        var chartType = self.data.chartType
        var gender = self.data.gender || 'boy'
        var dataMap = chartType === 'height'
          ? (gender === 'girl' ? WHO_GIRL_HEIGHT : WHO_BOY_HEIGHT)
          : (gender === 'girl' ? WHO_GIRL_WEIGHT : WHO_BOY_WEIGHT)

        var unit = chartType === 'height' ? 'cm' : 'kg'
        var padL = 50, padR = 20, padT = 30, padB = 40
        var plotW = width - padL - padR
        var plotH = height - padT - padB

        ctx.clearRect(0, 0, width, height)

        var xMin = 0, xMax = 36
        var yVals = []
        for (var k = 0; k < MONTH_KEYS.length; k++) {
          var arr = dataMap[MONTH_KEYS[k]]
          if (arr) { yVals.push(arr[0]); yVals.push(arr[4]) }
        }
        var records = self.data.records
        for (var ri = 0; ri < records.length; ri++) {
          var val = parseFloat(chartType === 'height' ? records[ri].height_cm : records[ri].weight_kg)
          if (val > 0) yVals.push(val)
        }
        var yMin = Math.floor(Math.min.apply(null, yVals) * 0.9)
        var yMax = Math.ceil(Math.max.apply(null, yVals) * 1.05)
        if (yMax - yMin < 5) { yMin -= 2; yMax += 2 }

        function toX(month) { return padL + (month - xMin) / (xMax - xMin) * plotW }
        function toY(val) { return padT + plotH - (val - yMin) / (yMax - yMin) * plotH }

        // Grid
        ctx.strokeStyle = '#F0EDEA'
        ctx.lineWidth = 0.5
        var yStep = Math.ceil((yMax - yMin) / 5)
        for (var gy = yMin; gy <= yMax; gy += yStep) {
          var yPos = toY(gy)
          ctx.beginPath(); ctx.moveTo(padL, yPos); ctx.lineTo(width - padR, yPos); ctx.stroke()
          ctx.fillStyle = '#999'; ctx.font = '10px sans-serif'; ctx.textAlign = 'right'
          ctx.fillText(gy, padL - 5, yPos + 3)
        }

        // X labels
        ctx.fillStyle = '#999'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center'
        for (var xi = 0; xi < MONTH_KEYS.length; xi++) {
          ctx.fillText(MONTH_KEYS[xi], toX(MONTH_KEYS[xi]), height - padB + 16)
        }
        ctx.fillText('月龄', width / 2, height - 5)

        // Percentile curves
        var colors = ['#E0E0E0', '#BDBDBD', '#4F8CFF', '#BDBDBD', '#E0E0E0']
        var widths = [1, 1, 2.5, 1, 1]
        for (var p = 0; p < 5; p++) {
          ctx.beginPath()
          ctx.strokeStyle = colors[p]; ctx.lineWidth = widths[p]
          ctx.setLineDash(p === 2 ? [] : [4, 3])
          for (var mi = 0; mi < MONTH_KEYS.length; mi++) {
            var m = MONTH_KEYS[mi]
            var arr2 = dataMap[m]
            if (!arr2) continue
            var px = toX(m), py = toY(arr2[p])
            if (mi === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
          }
          ctx.stroke(); ctx.setLineDash([])
          if (p === 2) {
            ctx.fillStyle = '#4F8CFF'; ctx.font = 'bold 10px sans-serif'
            ctx.fillText('P50', toX(36) - 15, toY(dataMap[36][2]) - 4)
          }
        }

        // Baby data points
        ctx.fillStyle = '#D4786B'
        for (var di = 0; di < records.length; di++) {
          var rec = records[di]
          var rdate = rec.record_date || ''
          var rval = parseFloat(chartType === 'height' ? rec.height_cm : rec.weight_kg)
          if (!rval || rval <= 0) continue
          var monthAge = 0
          if (rdate) {
            var birthday = self.data.babyBirthday
            if (!birthday) { continue }
            var bd = new Date(birthday)
            var rd = new Date(rdate)
            monthAge = (rd.getFullYear() - bd.getFullYear()) * 12 + (rd.getMonth() - bd.getMonth())
            if (monthAge < 0) monthAge = 0
            if (monthAge > 36) monthAge = 36
          }
          var sx = toX(monthAge), sy = toY(rval)
          if (sx >= padL && sx <= width - padR && sy >= padT && sy <= height - padB) {
            ctx.beginPath(); ctx.arc(sx, sy, 5, 0, 2 * Math.PI); ctx.fill()
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke()
          }
        }

        ctx.fillStyle = '#D4786B'; ctx.font = '11px sans-serif'
        ctx.fillText('● 宝宝实测', width - padR - 80, padT + 14)

        ctx.save(); ctx.translate(12, height / 2); ctx.rotate(-Math.PI / 2)
        ctx.fillStyle = '#666'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center'
        ctx.fillText('身高 (' + unit + ')', 0, 0); ctx.restore()
      })
  },

  /* ===== 日期筛选 ===== */

  onDateFromChange: function (e) {
    var dateStr = e.detail.value
    this.setData({ dateFrom: dateStr, dateFromDisplay: formatDateDisplay(dateStr) })
    this.loadRecords()
  },

  onDateToChange: function (e) {
    var dateStr = e.detail.value
    this.setData({ dateTo: dateStr, dateToDisplay: formatDateDisplay(dateStr) })
    this.loadRecords()
  },

  deleteRecord: function (e) {
    var self = this
    var id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条成长记录吗？',
      success: function (res) {
        if (res.confirm) {
          deleteGrowth(id).then(function () {
            wx.showToast({ title: '已删除', icon: 'success' })
            self.loadRecords()
          }).catch(function () {
            wx.showToast({ title: '删除失败', icon: 'none' })
          })
        }
      }
    })
  },

  editRecord: function (e) {
    var id = e.currentTarget.dataset.id
    var records = this.data.records
    var record = null
    for (var i = 0; i < records.length; i++) {
      if (records[i].id === id) { record = records[i]; break }
    }
    if (record) {
      getApp().globalData.editRecord = record
      wx.setStorageSync('editRecord_growth', record)
      wx.navigateTo({ url: '/pages/growth/add/add?mode=edit&id=' + id })
    }
  },

  goAdd: function () {
    wx.navigateTo({ url: '/pages/growth/add/add' })
  }
})
