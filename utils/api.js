/**
 * BabyCare API 请求封装
 */

var BASE_URL = 'https://babycare-backend-teha.onrender.com'
var H = require('./helpers')

function request(url, options) {
  var method = (options && options.method) || 'GET'
  var data = options && options.data
  var showLoading = options && options.showLoading
  var timeout = (options && options.timeout) || 15000

  if (showLoading) {
    wx.showLoading({ title: '加载中...', mask: true })
  }

  return new Promise(function (resolve, reject) {
    wx.request({
      url: BASE_URL + url,
      timeout: timeout,
      method: method,
      data: data,
      header: {
        'Content-Type': 'application/json',
      },
      success: function (res) {
        var body = res.data
        // 优先按 HTTP 状态码判断：4xx/5xx 一律视为业务错误
        if (res.statusCode >= 400) {
          var errMsg = (body && body.message) || ''
          if (!errMsg && typeof body === 'string') errMsg = body
          reject(new Error(errMsg || '请求失败（' + res.statusCode + '）'))
          return
        }
        if (body && body.code === 0) {
          resolve(body.data)
        } else {
          reject(new Error((body && body.message) || '请求失败'))
        }
      },
      fail: function (err) {
        reject(new Error(err.errMsg || '网络错误'))
      },
      complete: function () {
        if (showLoading) wx.hideLoading()
      },
    })
  })
}

// ========== 喂养记录 ==========

function getFeedingRecords(babyId, date, familyId) {
  var url = '/api/feeding?baby_id=' + babyId + '&date=' + (date || '')
  if (familyId) url += '&family_id=' + familyId
  return request(url)
}

function getFeedingRecord(id) {
  return request('/api/feeding/' + id)
}

function createFeeding(data) {
  return request('/api/feeding', { method: 'POST', data: data })
}

function deleteFeeding(id) {
  return request('/api/feeding/' + id, { method: 'DELETE' })
}

function updateFeeding(id, data) {
  return request('/api/feeding/' + id, { method: 'PUT', data: data })
}

// ========== 睡眠记录 ==========

function getSleepRecords(babyId, date) {
  return request('/api/sleep?baby_id=' + babyId + '&date=' + (date || ''))
}

function getSleepRecord(id) {
  return request('/api/sleep/' + id)
}

function createSleep(data) {
  return request('/api/sleep', { method: 'POST', data: data })
}

function deleteSleep(id) {
  return request('/api/sleep/' + id, { method: 'DELETE' })
}

function updateSleep(id, data) {
  return request('/api/sleep/' + id, { method: 'PUT', data: data })
}

// ========== 尿布记录 ==========

function getDiaperRecords(babyId, date) {
  return request('/api/diaper?baby_id=' + babyId + '&date=' + (date || ''))
}

function getDiaperRecord(id) {
  return request('/api/diaper/' + id)
}

function createDiaper(data) {
  return request('/api/diaper', { method: 'POST', data: data })
}

function deleteDiaper(id) {
  return request('/api/diaper/' + id, { method: 'DELETE' })
}

function updateDiaper(id, data) {
  return request('/api/diaper/' + id, { method: 'PUT', data: data })
}

// ========== AI 接口 ==========

/**
 * 语音文本解析（已识别的文字 → 结构化记录）
 */
function parseVoiceText(text) {
  return request('/api/ai/voice-parse', {
    method: 'POST',
    data: { text: text },
    showLoading: true,
  })
}

/**
 * 语音 → 结构化记录（含 ASR）
 * @param {string} audioBase64 - 音频文件的 base64 编码
 * @param {string} format - 音频格式，默认 mp3
 */
function voiceToRecord(audioBase64, format) {
  return request('/api/ai/voice-to-record', {
    method: 'POST',
    data: { audio: audioBase64, format: format || 'mp3' },
    showLoading: false,
  })
}

/**
 * 智能助手 — 自动判断记录/对话意图
 */
function smartChat(text) {
  return request('/api/ai/smart', {
    method: 'POST',
    data: { text: text },
    showLoading: false,
    timeout: 45000,
  }).then(function (res) {
    return (res && res.data) ? res.data : res
  })
}

/**
 * AI 育儿顾问对话
 */
function aiChat(message, context) {
  return request('/api/ai/chat', {
    method: 'POST',
    data: { message: message, context: context },
  })
}

// ========== 分析报告 ==========

/**
 * 生成 AI 分析报告（传入已有记录数据）
 * @param {Object} data - { baby_id, period, feeding[], sleep[], diaper[] }
 */
function getAnalysisReport(data) {
  return request('/api/analysis/report', {
    method: 'POST',
    data: data,
    showLoading: true,
  })
}

/**
 * 快捷：获取日报分析（自动拉取当天数据并分析）
 */
function getDailyReport(babyId, date) {
  var d = date || H.nowDate()
  return Promise.all([
    getFeedingRecords(babyId, d),
    getSleepRecords(babyId, d),
    getDiaperRecords(babyId, d),
    getGrowthRecords(babyId).catch(function () { return [] }),
    getVaccinations(babyId).catch(function () { return [] }),
    getMedications(babyId, d).catch(function () { return [] }),
    getNotes(babyId, d).catch(function () { return [] }),
  ]).then(function (results) {
    return getAnalysisReport({
      baby_id: babyId,
      period: 'daily',
      feeding: results[0] || [],
      sleep: results[1] || [],
      diaper: results[2] || [],
      growth: results[3] || [],
      vaccination: results[4] || [],
      medication: results[5] || [],
      notes: results[6] || [],
    })
  })
}

/**
 * 快捷：获取周报分析（自动拉取近 7 天数据并分析）
 */
function getWeeklyReport(babyId) {
  return fetchAllRecords(babyId, 7).then(function (records) {
    return getAnalysisReport({
      baby_id: babyId,
      period: 'weekly',
      feeding: records.feeding,
      sleep: records.sleep,
      diaper: records.diaper,
      growth: records.growth,
      vaccination: records.vaccination,
      medication: records.medication,
      notes: records.notes,
    })
  })
}

/**
 * 快捷：获取月报分析（自动拉取近 30 天数据并分析）
 */
function getMonthlyReport(babyId) {
  return fetchAllRecords(babyId, 30).then(function (records) {
    return getAnalysisReport({
      baby_id: babyId,
      period: 'monthly',
      feeding: records.feeding,
      sleep: records.sleep,
      diaper: records.diaper,
      growth: records.growth,
      vaccination: records.vaccination,
      medication: records.medication,
      notes: records.notes,
    })
  })
}

// ========== 成长记录 ==========

function getGrowthRecords(babyId, dateFrom, dateTo) {
  var params = '?baby_id=' + babyId
  if (dateFrom) params += '&date_from=' + dateFrom
  if (dateTo) params += '&date_to=' + dateTo
  return request('/api/growth' + params)
}

function getGrowthRecord(id) {
  return request('/api/growth/' + id)
}

function createGrowth(data) {
  return request('/api/growth', { method: 'POST', data: data })
}

function updateGrowth(id, data) {
  return request('/api/growth/' + id, { method: 'PUT', data: data })
}

function deleteGrowth(id) {
  return request('/api/growth/' + id, { method: 'DELETE' })
}

// ========== 疫苗接种 ==========

function getVaccinations(babyId, status, dateFrom, dateTo) {
  var params = '?baby_id=' + babyId
  if (status) params += '&status=' + status
  if (dateFrom) params += '&date_from=' + dateFrom
  if (dateTo) params += '&date_to=' + dateTo
  return request('/api/vaccination' + params)
}

function getVaccination(id) {
  return request('/api/vaccination/' + id)
}

function createVaccination(data) {
  return request('/api/vaccination', { method: 'POST', data: data })
}

function updateVaccination(id, data) {
  return request('/api/vaccination/' + id, { method: 'PUT', data: data })
}

function deleteVaccination(id) {
  return request('/api/vaccination/' + id, { method: 'DELETE' })
}

// ========== 用药记录 ==========

function getMedications(babyId, date) {
  return request('/api/medication?baby_id=' + babyId + '&date=' + (date || ''))
}

function getMedication(id) {
  return request('/api/medication/' + id)
}

function createMedication(data) {
  return request('/api/medication', { method: 'POST', data: data })
}

function updateMedication(id, data) {
  return request('/api/medication/' + id, { method: 'PUT', data: data })
}

function deleteMedication(id) {
  return request('/api/medication/' + id, { method: 'DELETE' })
}

// ========== 随手记 ==========

function createNote(data) {
  return request('/api/notes', { method: 'POST', data: data })
}

function getNotes(babyId, date) {
  var query = '?baby_id=' + babyId
  if (date) query += '&date=' + date
  return request('/api/notes' + query)
}

function deleteNote(id) {
  return request('/api/notes/' + id, { method: 'DELETE' })
}

function getNote(id) {
  return request('/api/notes/' + id)
}

function updateNote(id, data) {
  return request('/api/notes/' + id, { method: 'PUT', data: data })
}

// ========== 工具函数 ==========

/**
 * 获取指定天数内的日期列表（不含今天之后的日期）
 */
function getDateRange(days) {
  var dates = []
  var now = new Date()
  for (var i = 0; i < days; i++) {
    var d = new Date(now)
    d.setDate(d.getDate() - i)
    var dateStr =
      d.getFullYear() +
      '-' +
      H.pad2(d.getMonth() + 1) +
      '-' +
      H.pad2(d.getDate())
    dates.push(dateStr)
  }
  return dates
}

/**
 * 拉取指定天数内的全部记录（7类）
 */
function fetchAllRecords(babyId, days) {
  var dates = getDateRange(days)
  var allFeeding = [], allSleep = [], allDiaper = []
  var allGrowth = [], allVaccination = [], allMedication = [], allNotes = []

  var promises = []
  dates.forEach(function (date) {
    promises.push(
      getFeedingRecords(babyId, date).then(function (r) { if (Array.isArray(r)) allFeeding = allFeeding.concat(r) }).catch(function (e) { console.error('[BulkExport] 获取喂养记录失败:', e) })
    )
    promises.push(
      getSleepRecords(babyId, date).then(function (r) { if (Array.isArray(r)) allSleep = allSleep.concat(r) }).catch(function (e) { console.error('[BulkExport] 获取睡眠记录失败:', e) })
    )
    promises.push(
      getDiaperRecords(babyId, date).then(function (r) { if (Array.isArray(r)) allDiaper = allDiaper.concat(r) }).catch(function (e) { console.error('[BulkExport] 获取尿布记录失败:', e) })
    )
  })

  // 新类型：时间范围查询
  promises.push(
    getGrowthRecords(babyId).then(function (r) { if (Array.isArray(r)) allGrowth = allGrowth.concat(r) }).catch(function (e) { console.error('[BulkExport] 获取成长记录失败:', e) })
  )
  promises.push(
    getVaccinations(babyId).then(function (r) { if (Array.isArray(r)) allVaccination = allVaccination.concat(r) }).catch(function (e) { console.error('[BulkExport] 获取疫苗记录失败:', e) })
  )
  promises.push(
    getMedications(babyId).then(function (r) { if (Array.isArray(r)) allMedication = allMedication.concat(r) }).catch(function (e) { console.error('[BulkExport] 获取用药记录失败:', e) })
  )
  promises.push(
    getNotes(babyId).then(function (r) { if (Array.isArray(r)) allNotes = allNotes.concat(r) }).catch(function (e) { console.error('[BulkExport] 获取笔记记录失败:', e) })
  )

  return Promise.all(promises).then(function () {
    return {
      feeding: allFeeding, sleep: allSleep, diaper: allDiaper,
      growth: allGrowth, vaccination: allVaccination,
      medication: allMedication, notes: allNotes
    }
  })
}

// ========== 认证 ==========

function login(code, nickname, avatarUrl) {
  return request('/api/auth/login', {
    method: 'POST',
    data: { code: code, nickname: nickname, avatarUrl: avatarUrl }
  })
}

// ========== 家庭 ==========

function createFamily(openid, babyName, babyBirthday, babyAvatar, role, babyGender) {
  return request('/api/family/create', {
    method: 'POST',
    data: {
      openid: openid,
      babyName: babyName,
      babyBirthday: babyBirthday,
      babyAvatar: babyAvatar,
      role: role,
      babyGender: babyGender || 'male'
    }
  })
}

function joinFamily(openid, familyId, role) {
  return request('/api/family/join', {
    method: 'POST',
    data: {
      openid: openid,
      familyId: familyId,
      role: role
    }
  })
}

function getFamilyMembers(openid) {
  return request('/api/family/members?openid=' + openid)
}

// ========== 家庭扩展 (宝宝管理 / 权限 / 头像 / 时间线) ==========

function getBabies(familyId) {
  return request('/api/family/babies?family_id=' + familyId)
}

function createBaby(familyId, data) {
  data.family_id = familyId
  return request('/api/family/baby', { method: 'POST', data: data })
}

function updateBaby(familyId, babyId, data) {
  data.family_id = familyId
  return request('/api/family/baby/' + babyId, { method: 'PUT', data: data })
}

function deleteBaby(familyId, babyId) {
  return request('/api/family/baby/' + babyId + '?family_id=' + familyId, { method: 'DELETE' })
}

function getFamilyPermissions(familyId) {
  return request('/api/family/permissions?family_id=' + familyId)
}

function updateFamilyPermissions(familyId, openid, role, operatorOpenid) {
  return request('/api/family/permissions', {
    method: 'PUT',
    data: { family_id: familyId, openid: openid, role: role, operator_openid: operatorOpenid }
  })
}

function uploadAvatar(filePath) {
  return new Promise(function (resolve, reject) {
    wx.uploadFile({
      url: BASE_URL + '/api/family/avatar',
      filePath: filePath,
      name: 'file',
      success: function (res) {
        try {
          var body = JSON.parse(res.data)
          if (body.code === 0) resolve(body.data)
          else reject(new Error(body.message || '上传失败'))
        } catch (e) {
          reject(new Error('服务器响应异常'))
        }
      },
      fail: function (err) {
        reject(new Error(err.errMsg || '上传失败'))
      }
    })
  })
}

function getFamilyTimeline(familyId) {
  return request('/api/family/timeline?family_id=' + familyId)
}


module.exports = {
  // 认证
  login: login,
  // 家庭
  createFamily: createFamily,
  joinFamily: joinFamily,
  getFamilyMembers: getFamilyMembers,
  getBabies: getBabies,
  createBaby: createBaby,
  updateBaby: updateBaby,
  deleteBaby: deleteBaby,
  getFamilyPermissions: getFamilyPermissions,
  updateFamilyPermissions: updateFamilyPermissions,
  uploadAvatar: uploadAvatar,
  getFamilyTimeline: getFamilyTimeline,
  // 喂养
  getFeedingRecords: getFeedingRecords,
  getFeedingRecord: getFeedingRecord,
  createFeeding: createFeeding,
  updateFeeding: updateFeeding,
  deleteFeeding: deleteFeeding,
  // 睡眠
  getSleepRecords: getSleepRecords,
  getSleepRecord: getSleepRecord,
  createSleep: createSleep,
  updateSleep: updateSleep,
  deleteSleep: deleteSleep,
  // 尿布
  getDiaperRecords: getDiaperRecords,
  getDiaperRecord: getDiaperRecord,
  createDiaper: createDiaper,
  updateDiaper: updateDiaper,
  deleteDiaper: deleteDiaper,
  // 成长
  getGrowthRecords: getGrowthRecords,
  getGrowthRecord: getGrowthRecord,
  createGrowth: createGrowth,
  updateGrowth: updateGrowth,
  deleteGrowth: deleteGrowth,
  // 疫苗
  getVaccinations: getVaccinations,
  getVaccination: getVaccination,
  createVaccination: createVaccination,
  updateVaccination: updateVaccination,
  deleteVaccination: deleteVaccination,
  // 用药
  getMedications: getMedications,
  getMedication: getMedication,
  createMedication: createMedication,
  updateMedication: updateMedication,
  deleteMedication: deleteMedication,
  // 随手记
  createNote: createNote,
  getNotes: getNotes,
  getNote: getNote,
  deleteNote: deleteNote,
  updateNote: updateNote,
  // AI
  parseVoiceText: parseVoiceText,
  voiceToRecord: voiceToRecord,
  aiChat: aiChat,
  smartChat: smartChat,
  // 分析
  getAnalysisReport: getAnalysisReport,
  getDailyReport: getDailyReport,
  getWeeklyReport: getWeeklyReport,
  getMonthlyReport: getMonthlyReport,
  fetchAllRecords: fetchAllRecords,
}
