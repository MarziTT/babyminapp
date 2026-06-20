var { getFeedingRecords, getSleepRecords, getDiaperRecords, getGrowthRecords, getVaccinations, getMedications, getFamilyMembers, getBabies, getFamilyTimeline } = require('../../utils/api')
var { getOpenId, getFamilyId, getMyRole, setFamilyId, setMyRole, getActiveBaby, setActiveBaby, getBabyId } = require('../../utils/baby')
var H = require('../../utils/helpers')

Page({
  data: {
    babyName: '宝宝',
    familyId: '',
    myRole: '',
    userInfo: null,
    reminder: null,
    todaySummary: {
      feeding: { count: 0, duration: 0, amount: 0, lastTime: '' },
      sleep: { count: 0, totalHours: 0 },
      diaper: { count: 0 }
    },
    recentRecords: [],
    quickActions: [
      { icon: '🍼', label: '喂奶', sub: '高频', page: '/pages/feeding/add/add', bgColor: '#FFE4E1' },
      { icon: '😴', label: '睡眠', sub: '高频', page: '/pages/sleep/add/add', bgColor: '#E0F0FF' },
      { icon: '🧷', label: '尿布', sub: '高频', page: '/pages/diaper/add/add', bgColor: '#E8F5E9' },
      { icon: '🎙️', label: '助手', sub: '快捷', page: '/pages/smart/smart', bgColor: '#FFF9C4' },
      { icon: '📊', label: '周报', sub: '分析', page: '/pages/report/weekly/weekly', bgColor: '#E1BEE7' },
      { icon: '⏱️', label: '计时', sub: '工具', page: '/pages/timer/timer', bgColor: '#FFEBEE' },
      { icon: '🎵', label: '白噪音', sub: '安抚', page: '/pages/player/player', bgColor: '#BBDEFB' },
      { icon: '👨‍👩‍👧', label: '家庭', sub: '管理', page: '/pages/family/family', bgColor: '#ECEFF1' },
      { icon: '📏', label: '成长记录', sub: '身高/体重/头围', page: '/pages/growth/add/add', bgColor: '#F3E5F5' },
      { icon: '💉', label: '疫苗接种', sub: '接种提醒与记录', page: '/pages/vaccination/add/add', bgColor: '#FFF3E0' },
      { icon: '💊', label: '用药记录', sub: '药品剂量与频次', page: '/pages/medication/add/add', bgColor: '#E0F2F1' },
    ],
    noFamily: true,
    familyMembers: [],
    // 多宝宝
    babies: [],
    activeBaby: null,
    // 家庭时间线
    timelineList: [],
    timelineLoading: false
  },

  onLoad: function () {
    var openid = getOpenId()
    if (!openid) {
      wx.reLaunch({ url: '/pages/login/login' })
      return
    }

    var userInfo = wx.getStorageSync('userInfo')
    var cachedBaby = getActiveBaby()
    this.setData({ userInfo: userInfo, familyId: getFamilyId(), myRole: getMyRole(), activeBaby: cachedBaby })
    this.loadFamilyInfo()
    this.loadTodayData()
  },

  onShow: function () {
    this.loadFamilyInfo()
    this.loadTodayData()
    this.checkWeeklyReport()
    this.loadBabies()
    this.loadTimeline()
  },

  onPullDownRefresh: function () {
    var self = this
    Promise.all([this.loadFamilyInfo(), this.loadTodayData()]).then(function () {
      wx.stopPullDownRefresh()
    }).catch(function (err) {
      console.error('[Index] 页面初始化失败:', err)
      wx.stopPullDownRefresh()
    })
  },

  loadFamilyInfo: function () {
    var self = this
    var openid = getOpenId()
    if (!openid) return Promise.resolve()

    return getFamilyMembers(openid)
      .then(function (res) {
        var members = res.members || []
        var dadMember = null
        var momMember = null
        for (var i = 0; i < members.length; i++) {
          if (members[i].role === 'dad') dadMember = members[i]
          if (members[i].role === 'mom') momMember = members[i]
        }

        var babies = res.babies || []
        // 若无 activeBaby 或用第一个宝宝兜底
        if (babies.length > 0) {
          var cur = self.data.activeBaby
          var found = cur && babies.find(function (b) { return b.id === cur.id })
          if (!found) {
            var baby = babies[0]
            self.setData({ activeBaby: baby })
            setActiveBaby(baby)
          }
        }

        self.setData({
          familyId: res.familyId,
          babyName: res.babyName || '宝宝',
          myRole: res.myRole || '',
          noFamily: false,
          babies: babies,
          familyMembers: [dadMember, momMember].filter(Boolean)
        })
        setFamilyId(res.familyId)
        setMyRole(res.myRole)
      })
      .catch(function () {
        self.setData({ noFamily: true })
      })
  },

  loadTodayData: function () {
    var self = this
    var familyId = getFamilyId()
    if (!familyId) return Promise.resolve()

    var d = new Date()
    var m = d.getMonth() + 1
    var dd = d.getDate()
    var today = d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (dd < 10 ? '0' : '') + dd
    var babyId = getBabyId() || familyId

    return Promise.all([
      getFeedingRecords(babyId, today, familyId).catch(function () { return [] }),
      getSleepRecords(babyId, today, familyId).catch(function () { return [] }),
      getDiaperRecords(babyId, today, familyId).catch(function () { return [] }),
      getGrowthRecords(babyId).catch(function () { return [] }),
      getVaccinations(babyId).catch(function () { return [] }),
      getMedications(babyId, today, familyId).catch(function () { return [] }),
    ]).then(function (results) {
      var feedingList = Array.isArray(results[0]) ? results[0] : (results[0] && results[0].records) || []
      var sleepList = Array.isArray(results[1]) ? results[1] : (results[1] && results[1].records) || []
      var diaperList = Array.isArray(results[2]) ? results[2] : (results[2] && results[2].records) || []
      var growthList = Array.isArray(results[3]) ? results[3] : (results[3] && results[3].records) || []
      var vaccinationList = Array.isArray(results[4]) ? results[4] : (results[4] && results[4].records) || []
      var medicationList = Array.isArray(results[5]) ? results[5] : (results[5] && results[5].records) || []

      // 按 activeBaby 过滤记录（兼容旧数据：旧数据 baby_id = familyId，新数据 baby_id = activeBaby.id）
      var active = getActiveBaby()
      if (active && active.id) {
        var fid = familyId
        feedingList = feedingList.filter(function (r) { return r.baby_id === active.id || r.baby_id === fid })
        sleepList = sleepList.filter(function (r) { return r.baby_id === active.id || r.baby_id === fid })
        diaperList = diaperList.filter(function (r) { return r.baby_id === active.id || r.baby_id === fid })
        growthList = growthList.filter(function (r) { return r.baby_id === active.id || r.baby_id === fid })
        vaccinationList = vaccinationList.filter(function (r) { return r.baby_id === active.id || r.baby_id === fid })
        medicationList = medicationList.filter(function (r) { return r.baby_id === active.id || r.baby_id === fid })
      }

      var totalAmount = 0, totalDuration = 0
      feedingList.forEach(function (r) {
        totalAmount += r.amount_ml || r.amount || 0
        totalDuration += r.duration_minutes || r.duration || 0
      })
      var lastFeeding = feedingList.length > 0 ? feedingList[feedingList.length - 1] : null

      var totalSleepMinutes = 0
      sleepList.forEach(function (r) {
        totalSleepMinutes += r.duration_minutes || 0
      })

      var newSummary = {
        feeding: {
          count: feedingList.length,
          amount: totalAmount,
          duration: totalDuration,
          lastTime: lastFeeding ? self.formatTime(lastFeeding.start_time || lastFeeding.time) : ''
        },
        sleep: {
          count: sleepList.length,
          totalSleepMinutes: totalSleepMinutes,
          totalHours: Math.floor(totalSleepMinutes / 60),
          totalMins: totalSleepMinutes % 60
        },
        diaper: { count: diaperList.length }
      }

      // 合并 6 类记录并按时间排序
      var tagged = []
      feedingList.forEach(function (r) { tagged.push({ type: 'feeding', data: r, _time: H.formatDisplayTime(r.start_time || r.time || '') }) })
      sleepList.forEach(function (r) { tagged.push({ type: 'sleep', data: r, _time: H.formatDisplayTime(r.start_time || r.time || '') }) })
      diaperList.forEach(function (r) { tagged.push({ type: 'diaper', data: r, _time: H.formatDisplayTime(r.time || '') }) })
      growthList.forEach(function (r) { tagged.push({ type: 'growth', data: r, _time: H.formatDisplayTime(r.record_date || '') }) })
      vaccinationList.forEach(function (r) { tagged.push({ type: 'vaccination', data: r, _time: H.formatDisplayTime(r.scheduled_date || '') }) })
      medicationList.forEach(function (r) { tagged.push({ type: 'medication', data: r, _time: H.formatDisplayTime(r.start_time || '') }) })

      tagged.sort(function (a, b) {
        var ta = a.data.created_at || a.data.start_time || a.data.record_date || a.data.time || a.data.scheduled_date || ''
        var tb = b.data.created_at || b.data.start_time || b.data.record_date || b.data.time || b.data.scheduled_date || ''
        return tb.localeCompare(ta)
      })

      var missingTypes = []
      if (feedingList.length === 0) missingTypes.push('feeding')
      if (sleepList.length === 0) missingTypes.push('sleep')
      if (diaperList.length === 0) missingTypes.push('diaper')

      var reminder = null
      if (missingTypes.length === 0) {
        reminder = { text: '今日记录已完成', type: 'done' }
      } else {
        var labelMap = { feeding: '喂奶', sleep: '睡眠', diaper: '尿布' }
        var labels = missingTypes.map(function (t) { return labelMap[t] })
        reminder = { text: '今天还没记录' + labels.join('和') + '哦~ 点此补录', type: 'missing' }
      }

      self.setData({
        todaySummary: newSummary,
        recentRecords: tagged.slice(0, 5),
        reminder: reminder
      })
    }).catch(function (e) {
      wx.showToast({ title: '加载失败: ' + (e && e.message || '未知'), icon: 'none', duration: 2000 })
    })
  },

  formatTime: function (t) {
    if (!t) return ''
    return H.formatDisplayTime(t)
  },

  onQuickAction: function (e) {
    var page = e.currentTarget.dataset.page
    var tabPages = ['/pages/index/index', '/pages/smart/smart', '/pages/report/report', '/pages/ai/ai']
    if (tabPages.indexOf(page) !== -1) {
      wx.switchTab({ url: page })
    } else {
      wx.navigateTo({ url: page })
    }
  },

  goToDetail: function (e) {
    var type = e.currentTarget.dataset.type
    var count = this.data.todaySummary[type] && this.data.todaySummary[type].count || 0
    if (count > 0) {
      wx.navigateTo({ url: '/pages/' + type + '/' + type })
    } else {
      wx.navigateTo({ url: '/pages/' + type + '/add/add' })
    }
  },

  onTapReminder: function () {
    var reminder = this.data.reminder
    if (reminder && reminder.type === 'missing') {
      wx.switchTab({ url: '/pages/voice/voice' })
    }
  },

  onGoFamily: function () {
    wx.navigateTo({ url: '/pages/family/family' })
  },

  checkWeeklyReport: function () {
    var lastReport = wx.getStorageSync('babycare_last_report_date') || ''
    var today = this.getTodayStr()
    if (lastReport === today) return

    var daysSinceLast = 999
    if (lastReport) {
      try {
        var d1 = new Date(lastReport.replace(/-/g, '/'))
        var d2 = new Date(today.replace(/-/g, '/'))
        daysSinceLast = Math.floor((d2 - d1) / (1000 * 60 * 60 * 24))
      } catch (e) {}
    }

    if (daysSinceLast >= 7) {
      wx.setStorageSync('babycare_last_report_date', today)
      var self = this
      wx.showModal({
        title: '周报时间',
        content: '过去一周的育儿数据可以生成周报啦，现在查看吗？',
        confirmText: '查看',
        cancelText: '稍后',
        success: function (res) {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/report/weekly/weekly' })
          }
        }
      })
    }
  },

  getTodayStr: function () {
    var d = new Date()
    var m = d.getMonth() + 1
    var dd = d.getDate()
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (dd < 10 ? '0' : '') + dd
  },

  // ========== 多宝宝切换 ==========

  loadBabies: function () {
    var self = this
    var familyId = getFamilyId()
    if (!familyId) return

    getBabies(familyId).then(function (babies) {
      if (!babies || !babies.length) return
      self.setData({ babies: babies })
    }).catch(function (e) { console.error('[Index] 获取宝宝列表失败:', e) })
  },

  switchBaby: function (e) {
    var babyId = e.currentTarget.dataset.id
    var baby = this.data.babies.find(function (b) { return b.id === babyId })
    if (!baby) return
    this.setData({ activeBaby: baby })
    setActiveBaby(baby)
    Promise.all([this.loadTodayData(), this.loadTimeline()]).catch(function () {
      wx.showToast({ title: '切换失败', icon: 'none' })
    })
  },

  onAddBaby: function () {
    this.setData({ showBabyPicker: false })
    wx.navigateTo({ url: '/pages/family/family' })
  },

  // ========== 家庭动态时间线 ==========

  loadTimeline: function () {
    var self = this
    var familyId = getFamilyId()
    if (!familyId) return

    self.setData({ timelineLoading: true })
    getFamilyTimeline(familyId).then(function (events) {
      // 按 activeBaby 过滤时间线（兼容旧数据）
      var active = getActiveBaby()
      var fid = familyId
      if (active && active.id) {
        events = (events || []).filter(function (e) {
          return e.baby_id === active.id || e.baby_id === fid
        })
      }
      var list = (events || []).map(function (e) {
        var labelMap = {
          '喂奶': { label: '喂养', icon: '🍼', detail: (e.feed_type || '') + ' ' + (e.duration_minutes ? e.duration_minutes + '分钟' : '') + ' ' + (e.amount_ml ? e.amount_ml + 'ml' : '') },
          '睡眠': { label: '睡眠', icon: '😴', detail: e.duration_minutes ? e.duration_minutes + '分钟' : '' },
          '尿布': { label: '尿布', icon: '🧷', detail: e.diaper_type || '' },
          '成长记录': { label: '成长记录', icon: '📏', detail: (e.height_cm ? e.height_cm + 'cm' : '') + ' ' + (e.weight_kg ? e.weight_kg + 'kg' : '') },
          '疫苗接种': { label: '疫苗接种', icon: '💉', detail: e.vaccine_name || e.status || '' },
          '用药记录': { label: '用药记录', icon: '💊', detail: e.medicine_name || '' },
          '随手记': { label: '随手记', icon: '📝', detail: e.text || '' }
        }
        var info = labelMap[e.event_type] || { label: e.event_type || '记录', icon: '📋', detail: '' }
        return {
          eventType: info.label,
          icon: info.icon,
          detail: info.detail,
          time: H.formatDisplayTime(e.start_time || e.time || e.record_date || e.scheduled_date || ''),
          recordedByName: e.recorded_by_name || '',
          recordedByAvatar: e.recorded_by_avatar || ''
        }
      })
      self.setData({ timelineList: list, timelineLoading: false })
    }).catch(function () {
      self.setData({ timelineLoading: false })
    })
  }
})
