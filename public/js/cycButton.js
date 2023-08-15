export function handleButtonClick(socket, clientId) {
    const message = {
        message: 'count',
        clientId: clientId,
      };

    socket.send(JSON.stringify(message));
  }
  