const presence = new Presence({
  clientId: '1336000000000000000', // MyuJiku Discord Application Client ID placeholder
});

enum ActivityAssets {
  Logo = 'https://i.imgur.com/placeholder-myujiku-logo.png',
}

presence.on('UpdateData', async () => {
  const presenceElem = document.getElementById('myujiku-discord-presence');
  if (!presenceElem) {
    presence.clearActivity();
    return;
  }

  const title = presenceElem.getAttribute('data-title');
  const artist = presenceElem.getAttribute('data-artist');
  const status = presenceElem.getAttribute('data-status');
  const coverUrl = presenceElem.getAttribute('data-cover-url');
  const durationStr = presenceElem.getAttribute('data-duration');
  const positionStr = presenceElem.getAttribute('data-position');
  const roomCode = presenceElem.getAttribute('data-room-code');

  // If toggle is OFF or no track is actively selected, clear Discord activity
  if (!title || !artist || !status) {
    presence.clearActivity();
    return;
  }

  const isPlaying = status === 'playing';
  const duration = Math.max(0, parseInt(durationStr || '0', 10));
  const position = Math.max(0, parseInt(positionStr || '0', 10));

  const presenceData: PresenceData = {
    largeImageKey: coverUrl || ActivityAssets.Logo,
    largeImageText: title,
    smallImageKey: isPlaying ? 'play' : 'pause',
    smallImageText: isPlaying ? 'Playing' : 'Paused',
    details: `Listening to ${title}`,
    state: `by ${artist}`,
  };

  if (isPlaying) {
    const nowSec = Math.floor(Date.now() / 1000);
    const start = nowSec - position;
    presenceData.startTimestamp = start;
    if (duration > 0) {
      presenceData.endTimestamp = start + duration;
    }
  }

  // Discord Rich Presence allows maximum 2 action buttons
  const buttons: PresenceButton[] = [
    {
      label: 'Listen on MyuJiku',
      url: 'https://myujiku.vercel.app',
    },
  ];

  if (roomCode && roomCode.trim().length > 0) {
    buttons.push({
      label: 'Join my room',
      url: `https://myujiku.vercel.app/together/${encodeURIComponent(roomCode.trim())}`,
    });
  }

  if (buttons.length > 0) {
    presenceData.buttons = [buttons[0], buttons[1]];
  }

  presence.setActivity(presenceData);
});
