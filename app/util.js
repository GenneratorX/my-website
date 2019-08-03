module.exports = {greetingMessage};

function greetingMessage() {
  currDate = new Date();
  if (currDate.getHours() >= 8 && currDate.getHours() < 18) {
    return 'Ziua bună';
  } else {
    if (currDate.getHours() >= 18 && currDate.getHours() <= 23) {
      return 'Bună seara';
    }
    return 'Neața';
  }
}
