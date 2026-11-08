import net from 'net';

const pipePath = '\\\\.\\pipe\\discord-ipc-0';
const socket = net.createConnection(pipePath, () => {
  console.log('Connected to Discord IPC');
  // Send Handshake
  const handshake = JSON.stringify({ v: 1, client_id: '1567903090177343499' });
  const hBuf = Buffer.from(handshake, 'utf-8');
  const hPacket = Buffer.alloc(8 + hBuf.length);
  hPacket.writeUInt32LE(0, 0);
  hPacket.writeUInt32LE(hBuf.length, 4);
  hBuf.copy(hPacket, 8);
  socket.write(hPacket);
});

let ready = false;

socket.on('data', (data) => {
  const opcode = data.readUInt32LE(0);
  const len = data.readUInt32LE(4);
  const payloadStr = data.subarray(8, 8 + len).toString('utf-8');
  const json = JSON.parse(payloadStr);

  if (!ready && opcode === 1 && json.evt === 'READY') {
    ready = true;
    console.log('Handshake successful! Sending SET_ACTIVITY...');

    const now = Math.floor(Date.now()); // ms or sec? Let's check!
    const nowSec = Math.floor(now / 1000);
    const durSec = 223;

    // Discord Rich Presence SET_ACTIVITY frame
    const activity = {
      cmd: 'SET_ACTIVITY',
      args: {
        pid: process.pid,
        activity: {
          type: 2, // Listening
          details: 'Feel Good Inc.',
          state: 'Gorillaz',
          timestamps: {
            start: nowSec - 45,
            end: nowSec + durSec - 45
          },
          assets: {
            large_image: 'logo',
            large_text: 'MyuJiku',
            small_image: 'play',
            small_text: 'Playing'
          },
          buttons: [
            { label: 'Listen on MyuJiku', url: 'https://myujiku.vercel.app' }
          ]
        }
      },
      nonce: 'test-123'
    };

    console.log('Payload sent:', JSON.stringify(activity, null, 2));

    const actStr = JSON.stringify(activity);
    const actBuf = Buffer.from(actStr, 'utf-8');
    const actPacket = Buffer.alloc(8 + actBuf.length);
    actPacket.writeUInt32LE(1, 0); // Opcode 1: Frame
    actPacket.writeUInt32LE(actBuf.length, 4);
    actBuf.copy(actPacket, 8);
    socket.write(actPacket);
  } else if (ready) {
    console.log('Response from Discord to SET_ACTIVITY:');
    console.log('Opcode:', opcode);
    console.log('Data:', JSON.stringify(json, null, 2));
    socket.end();
    process.exit(0);
  }
});

