/**
 * BabyCare 共享工具函数
 * 统一管理所有页面的日期/时间/格式化辅助函数，消除代码重复
 */

function pad2(n) {
  return n < 10 ? '0' + n : '' + n
}

function nowDate() {
  var d = new Date()
  var m = d.getMonth() + 1
  return d.getFullYear() + '-' + pad2(m) + '-' + pad2(d.getDate())
}

function nowTime() {
  var d = new Date()
  return pad2(d.getHours()) + ':' + pad2(d.getMinutes())
}

function formatSeconds(total) {
  var m = Math.floor(total / 60)
  var s = total % 60
  return pad2(m) + ':' + pad2(s)
}

/** 从 ISO 字符串拆分日期和时间（用于编辑模式回填喂奶表单） */
function isoToTimeParts(isoStr) {
  if (!isoStr) return { date: nowDate(), timeVal: nowTime() }
  var parts = isoStr.split('T')
  return {
    date: parts[0],
    timeVal: (parts[1] || '').slice(0, 5)
  }
}

/** 获取当前本地时间（北京时间 UTC+8）的 ISO 字符串 */
function getLocalISO(d) {
  d = d || new Date()
  return d.getFullYear() + '-' +
    pad2(d.getMonth() + 1) + '-' +
    pad2(d.getDate()) + 'T' +
    pad2(d.getHours()) + ':' +
    pad2(d.getMinutes()) + ':' +
    pad2(d.getSeconds()) + '+08:00'
}

/** 将 ISO 时间字符串格式化为 "M/D HH:MM" 显示格式（例：6/20 20:06）。
 * 若无时间部分（纯日期 YYYY-MM-DD），返回 "M/D"。
 * 无时区标记的字符串按 UTC 解析 → 本地时间显示，修正后端 UTC 时间偏移 8 小时问题。 */
function formatDisplayTime(isoStr) {
  if (!isoStr) return ''
  var s = isoStr
  // 纯日期格式 YYYY-MM-DD
  if (s.indexOf('T') === -1 && s.indexOf(' ') === -1) {
    var parts = s.split('-')
    if (parts.length === 3) {
      return parseInt(parts[1], 10) + '/' + parseInt(parts[2], 10)
    }
    return s
  }
  // 标准化分隔符
  s = s.indexOf('T') !== -1 ? s : s.replace(' ', 'T')

  // 无时区标记（无 Z 也无 ±HH:MM）：new Date(str) 按 UTC 解析，getHours() 等返回本地时间
  if (s.indexOf('Z') === -1 && !/[\+\-]\d{2}:\d{2}$/.test(s)) {
    var d = new Date(s)
    if (!isNaN(d.getTime())) {
      return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes())
    }
    return s
  }

  // 有时区标记：用 Date 解析
  try {
    var d = new Date(s)
    if (isNaN(d.getTime())) return isoStr
    return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes())
  } catch (e) {
    return isoStr
  }
}

module.exports = {
  pad2: pad2,
  nowDate: nowDate,
  nowTime: nowTime,
  formatSeconds: formatSeconds,
  isoToTimeParts: isoToTimeParts,
  getLocalISO: getLocalISO,
  formatDisplayTime: formatDisplayTime
}
