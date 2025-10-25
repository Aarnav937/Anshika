// Time zone data - you could expand this or use a library like moment-timezone
const TIME_ZONES = {
  'UTC': 'UTC',
  'EST': 'America/New_York',
  'CST': 'America/Chicago',
  'MST': 'America/Denver',
  'PST': 'America/Los_Angeles',
  'GMT': 'Europe/London',
  'CET': 'Europe/Paris',
  'JST': 'Asia/Tokyo',
  'IST': 'Asia/Kolkata',
  'CST_China': 'Asia/Shanghai',
  'AEDT': 'Australia/Sydney'
};

export function getCurrentTime(timezone?: string): string {
  const now = new Date();

  if (timezone && TIME_ZONES[timezone as keyof typeof TIME_ZONES]) {
    // For basic timezone conversion, we'll use a simple offset approach
    // In production, consider using a proper timezone library
    const tz = TIME_ZONES[timezone as keyof typeof TIME_ZONES];
    try {
      const timeString = now.toLocaleString('en-US', {
        timeZone: tz,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });

      return `🕐 **Current Time in ${timezone} (${tz})**\n\n${timeString}`;
    } catch (error) {
      return `❌ Invalid timezone: ${timezone}. Available timezones: ${Object.keys(TIME_ZONES).join(', ')}`;
    }
  }

  // Default to local time
  const localTime = now.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZoneName: 'short'
  });

  return `🕐 **Current Local Time**\n\n${localTime}`;
}

export function getTimeDifference(fromTimezone: string, toTimezone: string): string {
  if (!TIME_ZONES[fromTimezone as keyof typeof TIME_ZONES] || !TIME_ZONES[toTimezone as keyof typeof TIME_ZONES]) {
    return `❌ Invalid timezone(s). Available: ${Object.keys(TIME_ZONES).join(', ')}`;
  }

  try {
    const now = new Date();
    const fromTime = now.toLocaleString('en-US', { timeZone: TIME_ZONES[fromTimezone as keyof typeof TIME_ZONES] });
    const toTime = now.toLocaleString('en-US', { timeZone: TIME_ZONES[toTimezone as keyof typeof TIME_ZONES] });

    const fromDate = new Date(fromTime);
    const toDate = new Date(toTime);

    const diffMs = toDate.getTime() - fromDate.getTime();
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));

    const direction = diffHours > 0 ? 'ahead' : 'behind';
    const hours = Math.abs(diffHours);

    return `⏰ **Time Difference: ${fromTimezone} to ${toTimezone}**\n\n${toTimezone} is ${hours} hour(s) ${direction} of ${fromTimezone}\n\n${fromTimezone}: ${fromDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}\n${toTimezone}: ${toDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
  } catch (error) {
    return `❌ Failed to calculate time difference: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

export function getDateInfo(dateString?: string): string {
  const targetDate = dateString ? new Date(dateString) : new Date();

  if (isNaN(targetDate.getTime())) {
    return `❌ Invalid date format. Try formats like "2024-01-15" or "January 15, 2024"`;
  }

  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC'
  };

  const fullDate = targetDate.toLocaleDateString('en-US', options);
  const dayOfYear = Math.floor((targetDate.getTime() - new Date(targetDate.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  const weekOfYear = Math.ceil(dayOfYear / 7);

  return `📅 **Date Information${dateString ? ` for ${dateString}` : ' (Today)'}**\n\n${fullDate}\n\n• Day of Year: ${dayOfYear}\n• Week of Year: ${weekOfYear}\n• Unix Timestamp: ${Math.floor(targetDate.getTime() / 1000)}\n• ISO Format: ${targetDate.toISOString().split('T')[0]}`;
}

export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day(s), ${hours % 24} hour(s), ${minutes % 60} minute(s)`;
  } else if (hours > 0) {
    return `${hours} hour(s), ${minutes % 60} minute(s), ${seconds % 60} second(s)`;
  } else if (minutes > 0) {
    return `${minutes} minute(s), ${seconds % 60} second(s)`;
  } else {
    return `${seconds} second(s)`;
  }
}

export function getAvailableTimezones(): string {
  return `🕐 **Available Timezones**\n\n${Object.keys(TIME_ZONES).join('\n')}\n\nUse these codes when asking for time in specific zones.`;
}

// Reminder functionality (basic in-memory storage - in production, use persistent storage)
const reminders: Array<{ id: string; message: string; time: Date }> = [];

function parseTimeString(timeString: string): Date | null {
  // First try direct Date parsing for absolute formats
  const directDate = new Date(timeString);
  if (!isNaN(directDate.getTime())) {
    return directDate;
  }

  const now = new Date();
  const lowerTimeString = timeString.toLowerCase().trim();

  // Handle "in X units" format
  const inPattern = /^in\s+(\d+)\s+(minute|minutes|min|mins|hour|hours|hr|hrs|day|days|week|weeks)$/;
  const inMatch = lowerTimeString.match(inPattern);
  if (inMatch) {
    const amount = parseInt(inMatch[1]);
    const unit = inMatch[2];

    const targetDate = new Date(now);

    switch (unit) {
      case 'minute':
      case 'minutes':
      case 'min':
      case 'mins':
        targetDate.setMinutes(targetDate.getMinutes() + amount);
        break;
      case 'hour':
      case 'hours':
      case 'hr':
      case 'hrs':
        targetDate.setHours(targetDate.getHours() + amount);
        break;
      case 'day':
      case 'days':
        targetDate.setDate(targetDate.getDate() + amount);
        break;
      case 'week':
      case 'weeks':
        targetDate.setDate(targetDate.getDate() + amount * 7);
        break;
      default:
        return null;
    }
    return targetDate;
  }

  // Handle "tomorrow at X" format
  const tomorrowPattern = /^tomorrow\s+at\s+(\d+)(?::(\d+))?\s*(am|pm)?$/i;
  const tomorrowMatch = lowerTimeString.match(tomorrowPattern);
  if (tomorrowMatch) {
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + 1);

    let hour = parseInt(tomorrowMatch[1]);
    const minute = tomorrowMatch[2] ? parseInt(tomorrowMatch[2]) : 0;
    const ampm = tomorrowMatch[3]?.toLowerCase();

    if (ampm === 'pm' && hour !== 12) {
      hour += 12;
    } else if (ampm === 'am' && hour === 12) {
      hour = 0;
    }

    targetDate.setHours(hour, minute, 0, 0);
    return targetDate;
  }

  // Handle "today at X" format
  const todayPattern = /^today\s+at\s+(\d+)(?::(\d+))?\s*(am|pm)?$/i;
  const todayMatch = lowerTimeString.match(todayPattern);
  if (todayMatch) {
    const targetDate = new Date(now);

    let hour = parseInt(todayMatch[1]);
    const minute = todayMatch[2] ? parseInt(todayMatch[2]) : 0;
    const ampm = todayMatch[3]?.toLowerCase();

    if (ampm === 'pm' && hour !== 12) {
      hour += 12;
    } else if (ampm === 'am' && hour === 12) {
      hour = 0;
    }

    targetDate.setHours(hour, minute, 0, 0);
    return targetDate;
  }

  return null;
}

export function setReminder(message: string, timeString: string): string {
  try {
    const reminderTime = parseTimeString(timeString);

    if (!reminderTime) {
      return `❌ Invalid time format. Try formats like:\n• "2024-01-15 14:30" (YYYY-MM-DD HH:MM)\n• "in 2 hours"\n• "in 2 mins"\n• "tomorrow at 3pm"\n• "today at 2:30pm"`;
    }

    const id = `reminder_${Date.now()}`;
    reminders.push({ id, message, time: reminderTime });

    return `⏰ **Reminder Set!**\n\n"${message}"\nScheduled for: ${reminderTime.toLocaleString()}\n\n*Note: This is a basic implementation. Reminders won't persist after app restart.*`;
  } catch (error) {
    return `❌ Failed to set reminder: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

export function getReminders(): string {
  if (reminders.length === 0) {
    return `📝 **No Active Reminders**\n\nYou haven't set any reminders yet.`;
  }

  let result = `📝 **Your Reminders**\n\n`;
  reminders.forEach((reminder, index) => {
    const now = new Date();
    const timeUntil = reminder.time.getTime() - now.getTime();

    result += `${index + 1}. "${reminder.message}"\n`;
    result += `   Scheduled: ${reminder.time.toLocaleString()}\n`;

    if (timeUntil > 0) {
      result += `   Time until: ${formatDuration(timeUntil)}\n\n`;
    } else {
      result += `   ⏰ OVERDUE by ${formatDuration(Math.abs(timeUntil))}\n\n`;
    }
  });

  return result;
}
