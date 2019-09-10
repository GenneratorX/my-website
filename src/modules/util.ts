'use strict';

export function greetingMessage(): 'Ziua bună' | 'Bună seara' | 'Neața' {
  const currentHour = new Date().getHours();
  if (currentHour >= 8 && currentHour < 18) {
    return 'Ziua bună';
  } else {
    if (currentHour >= 18 && currentHour <= 23) {
      return 'Bună seara';
    }
    return 'Neața';
  }
}
