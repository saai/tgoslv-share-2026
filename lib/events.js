const EVENT_CONFIGS = {
  '202601': {
    title: 'Vibe Engineering in 2026.1',
    dateText: '2026年1月24日（周五）',
    timeText: '2:00pm - 5:00pm',
    locationText: '地点待定（将在活动前通知）',
    organizerText: 'TGO 硅谷分会',
    capacity: null,
    registrationClosesAt: '2026-01-24T00:00:00-08:00',
    endsAt: '2026-01-24T23:59:00-08:00'
  },
  '202603': {
    title: 'From Prompt to Product + Share Your 🦞',
    dateText: '2026年3月21日（周六）',
    timeText: '16:00-20:00，场地提供晚餐。',
    locationText: '120 Rizal Drive, Hillsborough, CA',
    organizerText: 'TGO 硅谷分会',
    capacity: 40,
    registrationClosesAt: '2026-03-21T00:00:00-07:00',
    endsAt: '2026-03-21T23:59:00-07:00'
  }
};

function getEventConfig(eventId) {
  return EVENT_CONFIGS[eventId] || null;
}

module.exports = {
  EVENT_CONFIGS,
  getEventConfig
};
