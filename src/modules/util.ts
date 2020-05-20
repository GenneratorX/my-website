'use strict';

const MIN_HOUR_NOON = 8;
const MAX_HOUR_NOON = 18;
const MIN_EVENING_HOUR = 18;
const MAX_EVENING_HOUR = 23;

/**
 * Displays a greeting message based on the time of the day
 * @returns Greeting message
 */
export function greetingMessage(): 'Ziua bună' | 'Bună seara' | 'Neața' {
  const currentHour = new Date().getHours();
  if (currentHour >= MIN_HOUR_NOON && currentHour < MAX_HOUR_NOON) {
    return 'Ziua bună';
  } else {
    if (currentHour >= MIN_EVENING_HOUR && currentHour <= MAX_EVENING_HOUR) {
      return 'Bună seara';
    }
    return 'Neața';
  }
}
